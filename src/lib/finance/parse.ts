import Papa from "papaparse";
import { hashRow } from "./hash";

export type ParsedTransaction = {
  date: Date;
  description: string;
  amount: number; // sempre positivo
  flow: "ENTRADA" | "SAIDA";
  externalId: string;
};

export class StatementParseError extends Error {}

export function detectFileFormat(fileName: string, text: string): "OFX" | "CSV" {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".ofx") || lower.endsWith(".qfx")) return "OFX";
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return "CSV";
  // Fallback pelo conteúdo, caso a extensão não ajude
  return /<OFX>|<STMTTRN>/i.test(text) ? "OFX" : "CSV";
}

export function parseStatementFile(fileName: string, text: string): ParsedTransaction[] {
  const format = detectFileFormat(fileName, text);
  return format === "OFX" ? parseOFX(text) : parseCSV(text);
}

// ─── OFX ───────────────────────────────────────────────────────────────────
// Bancos brasileiros exportam OFX no formato SGML (tags sem fechamento),
// não XML de verdade — por isso um parser de regex simples é mais confiável
// aqui do que tentar usar um parser XML.
function parseOFX(text: string): ParsedTransaction[] {
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi);
  if (!blocks || blocks.length === 0) {
    throw new StatementParseError("Não encontramos nenhuma transação (<STMTTRN>) nesse arquivo OFX.");
  }

  const getTag = (block: string, tag: string) => {
    const match = block.match(new RegExp(`<${tag}>([^<\r\n]*)`, "i"));
    return match ? match[1].trim() : "";
  };

  return blocks.map((block) => {
    const rawDate = getTag(block, "DTPOSTED");
    const rawAmount = getTag(block, "TRNAMT");
    const memo = getTag(block, "MEMO");
    const name = getTag(block, "NAME");
    const fitId = getTag(block, "FITID");

    const date = parseOFXDate(rawDate);
    const amount = parseOFXAmount(rawAmount);
    const description = memo || name || "Lançamento sem descrição";

    return {
      date,
      description,
      amount: Math.abs(amount),
      flow: amount < 0 ? "SAIDA" : "ENTRADA",
      externalId: fitId ? `ofx:${fitId}` : `ofx:${hashRow([rawDate, description, rawAmount])}`,
    };
  });
}

function parseOFXDate(raw: string): Date {
  // Formato OFX: YYYYMMDDHHMMSS[.mmm][+TZ]
  const digits = raw.slice(0, 8);
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  if (!year || !month || !day) {
    throw new StatementParseError(`Data inválida no OFX: "${raw}"`);
  }
  return new Date(Date.UTC(year, month - 1, day));
}

function parseOFXAmount(raw: string): number {
  const normalized = raw.replace(",", ".");
  const value = Number(normalized);
  if (Number.isNaN(value)) {
    throw new StatementParseError(`Valor inválido no OFX: "${raw}"`);
  }
  return value;
}

// ─── CSV ───────────────────────────────────────────────────────────────────
const DATE_HEADER_HINTS = ["data lancamento", "data", "date", "dt lancamento", "dt movimento"];
const DESCRIPTION_HEADER_HINTS = ["historico", "descricao", "lancamento", "title", "memo", "detalhes"];
const AMOUNT_HEADER_HINTS = ["valor", "amount", "value"];
const DEBIT_HEADER_HINTS = ["debito", "saida", "valor debito"];
const CREDIT_HEADER_HINTS = ["credito", "entrada", "valor credito"];

function normalizeHeader(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function findColumn(headers: string[], hints: string[]): number {
  for (const hint of hints) {
    const idx = headers.findIndex((h) => h === hint);
    if (idx !== -1) return idx;
  }
  for (const hint of hints) {
    const idx = headers.findIndex((h) => h.includes(hint));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCSV(text: string): ParsedTransaction[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = result.data;
  if (!rows || rows.length < 2) {
    throw new StatementParseError("O arquivo CSV está vazio ou não tem linhas suficientes.");
  }

  // Alguns bancos colocam linhas de metadados antes do cabeçalho real —
  // procuramos a primeira linha que pareça um cabeçalho de extrato.
  let headerIndex = -1;
  let headers: string[] = [];
  let dateCol = -1;
  let descCol = -1;
  let amountCol = -1;
  let debitCol = -1;
  let creditCol = -1;

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const candidate = rows[i].map(normalizeHeader);
    const d = findColumn(candidate, DATE_HEADER_HINTS);
    const desc = findColumn(candidate, DESCRIPTION_HEADER_HINTS);
    const amt = findColumn(candidate, AMOUNT_HEADER_HINTS);
    const deb = findColumn(candidate, DEBIT_HEADER_HINTS);
    const cred = findColumn(candidate, CREDIT_HEADER_HINTS);
    if (d !== -1 && desc !== -1 && (amt !== -1 || (deb !== -1 && cred !== -1))) {
      headerIndex = i;
      headers = candidate;
      dateCol = d;
      descCol = desc;
      amountCol = amt;
      debitCol = deb;
      creditCol = cred;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new StatementParseError(
      "Não conseguimos identificar as colunas de data, descrição e valor nesse CSV. Exporte o extrato padrão do seu banco (com cabeçalho de Data, Histórico/Descrição e Valor)."
    );
  }

  const dataRows = rows.slice(headerIndex + 1).filter((r) => r.length > 1 && r.some((c) => c && c.trim() !== ""));

  return dataRows.map((row) => {
    const rawDate = row[dateCol] ?? "";
    const description = (row[descCol] ?? "").trim() || "Lançamento sem descrição";
    const date = parseCSVDate(rawDate);

    let amount: number;
    let flow: "ENTRADA" | "SAIDA";

    if (amountCol !== -1) {
      const value = parseCSVAmount(row[amountCol] ?? "0");
      amount = Math.abs(value);
      flow = value < 0 ? "SAIDA" : "ENTRADA";
    } else {
      const debitValue = parseCSVAmount(row[debitCol] ?? "0");
      const creditValue = parseCSVAmount(row[creditCol] ?? "0");
      if (Math.abs(debitValue) >= Math.abs(creditValue)) {
        amount = Math.abs(debitValue);
        flow = "SAIDA";
      } else {
        amount = Math.abs(creditValue);
        flow = "ENTRADA";
      }
    }

    return {
      date,
      description,
      amount,
      flow,
      externalId: `csv:${hashRow([rawDate, description, amount, flow])}`,
    };
  });
}

function parseCSVDate(raw: string): Date {
  const s = raw.trim();

  // dd/mm/yyyy ou dd-mm-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));

  // yyyy-mm-dd
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));

  throw new StatementParseError(`Data inválida no CSV: "${raw}"`);
}

function parseCSVAmount(raw: string): number {
  let s = raw.trim().replace(/^R\$\s*/i, "");
  if (s === "" || s === "-") return 0;

  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[()]/g, "");

  // Formato BR: 1.234,56 → remove separador de milhar, troca vírgula por ponto
  if (/,\d{1,2}$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  }

  const value = Number(s);
  if (Number.isNaN(value)) {
    throw new StatementParseError(`Valor inválido no CSV: "${raw}"`);
  }
  return negative ? -Math.abs(value) : value;
}
