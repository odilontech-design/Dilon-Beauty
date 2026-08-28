import { hashRow } from "./hash";
import { StatementParseError, type ParsedTransaction } from "./parse";

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function parseMonthName(raw: string): number | null {
  const abbr = raw.slice(0, 3).toLowerCase();
  return MONTHS[abbr] ?? null;
}

// ─── Extrato do app do Nubank ("Movimentações") ────────────────────────────
// Esse extrato não repete data/valor em R$ por linha como a maioria dos
// bancos — o texto vem assim:
//
//   01 AGO 2026 Total de saídas - 59,90
//   Compra no débito OBRAMAX 19,90
//   Transferência enviada pelo Pix ... -
//   BANCO INTER (0077) Agência: 1 Conta: 48237501-9
//   40,00
//
// A data e a direção (entrada/saída) aparecem só na linha de resumo do dia
// (ou numa linha "Total de entradas/saídas" isolada, quando o dia tem os
// dois sentidos) e valem pra todos os lançamentos seguintes até a próxima
// data ou "Total de...". Cada lançamento pode ocupar várias linhas de
// descrição e termina numa linha que é só o valor (sem "R$", sem sinal).
// O PDF também repete cabeçalho/rodapé em toda página — essas linhas
// precisam ser ignoradas sem contar como parte da descrição.
const NUBANK_MARKER_RE = /Movimentações/i;

const DATE_TOTAL_RE = /^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})\s+Total de (entradas|saídas)\s+([+-])\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/i;
const TOTAL_ONLY_RE = /^Total de (entradas|saídas)\s+([+-])\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/i;
const TRAILING_AMOUNT_RE = /^(.*?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/;

const NUBANK_BOILERPLATE_PATTERNS = [
  /^--\s*\d+\s+of\s+\d+\s*--$/i,
  /CPF Agência Conta/i,
  /VALORES EM R\$/i,
  /^Movimentações$/i,
  /^Saldo (inicial|final)/i,
  /^Rendimento líquido/i,
  /Tem alguma dúvida/i,
  /metropolitanas\)/i,
  /^Caso a solução fornecida/i,
  /disponíveis em nubank\.com\.br/i,
  /^Extrato gerado dia/i,
  /^O saldo líquido corresponde/i,
  /^Não nos responsabilizamos/i,
  /^Asseguramos a autenticidade/i,
  /^Nu Financeira S\.A\./i,
  /^Nu Pagamentos S\.A\./i,
  /^Sociedade de Credito, Financiamento e$/i,
  /^Investimento$/i,
  /^Instituição de$/i,
  /^Pagamento$/i,
  /^CNPJ:\s*[\d.\/-]+$/,
];

function isNubankStatement(text: string): boolean {
  return NUBANK_MARKER_RE.test(text) && /Total de (entradas|saídas)/i.test(text);
}

function parseNubankPDFText(rawText: string): ParsedTransaction[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  const results: ParsedTransaction[] = [];
  let currentDate: Date | null = null;
  let currentFlow: "ENTRADA" | "SAIDA" | null = null;
  let buffer: string[] = [];
  let skipNextLine = false; // pula o número da conta que vem logo após a linha "CPF Agência Conta"
  let rowIndex = 0;
  let pastMovimentacoes = false;

  for (const line of lines) {
    if (!pastMovimentacoes) {
      if (/^Movimentações$/i.test(line)) pastMovimentacoes = true;
      continue; // ignora todo o resumo do topo (saldo, rendimento etc.)
    }

    if (skipNextLine) {
      skipNextLine = false;
      continue;
    }

    if (NUBANK_BOILERPLATE_PATTERNS.some((re) => re.test(line))) {
      if (/CPF Agência Conta/i.test(line)) skipNextLine = true;
      buffer = [];
      continue;
    }

    let m = line.match(DATE_TOTAL_RE);
    if (m) {
      const month = parseMonthName(m[2]);
      if (month) {
        currentDate = new Date(Date.UTC(Number(m[3]), month - 1, Number(m[1])));
        currentFlow = m[4].toLowerCase() === "entradas" ? "ENTRADA" : "SAIDA";
        buffer = [];
        continue;
      }
    }

    m = line.match(TOTAL_ONLY_RE);
    if (m) {
      currentFlow = m[1].toLowerCase() === "entradas" ? "ENTRADA" : "SAIDA";
      buffer = [];
      continue;
    }

    m = line.match(TRAILING_AMOUNT_RE);
    if (m && currentDate && currentFlow) {
      const before = m[1].trim();
      const amount = Number(m[2].replace(/\./g, "").replace(",", "."));
      if (!Number.isNaN(amount) && amount > 0) {
        const description = [...buffer, before].filter(Boolean).join(" ").replace(/\s+/g, " ").trim() || "Lançamento sem descrição";
        results.push({
          date: currentDate,
          description,
          amount,
          flow: currentFlow,
          externalId: `pdf:${hashRow([currentDate.toISOString(), description, amount, currentFlow, rowIndex++])}`,
        });
      }
      buffer = [];
      continue;
    }

    buffer.push(line);
  }

  return results;
}

// ─── Extrato genérico em PDF (outros bancos) ───────────────────────────────
// Formato mais simples, com data isolada e valor sempre com "R$":
//   14 de agosto de 2026
//   Compra no débito - Mercado X
//   -R$ 45,90
const DATE_FULL_RE = /^(?:[a-zçãé]+,\s*)?(\d{1,2})\s+de\s+([a-zçã]{3,})\.?(?:\s+de\s+(\d{4}))?$/i;
const DATE_ABBR_RE = /^(\d{1,2})\s+([a-zçã]{3})\.?(?:\s+(\d{4}))?$/i;
const DATE_SLASH_RE = /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/;
const RS_AMOUNT_RE = /(-?)\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
const IGNORED_LINE_RE = /^--\s*\d+\s+of\s+\d+\s*--$/i; // marcador de página do pdf-parse

function extractGenericDate(line: string, referenceYear: number): Date | null {
  let m = line.match(DATE_FULL_RE);
  if (m) {
    const month = parseMonthName(m[2]);
    if (month) return new Date(Date.UTC(m[3] ? Number(m[3]) : referenceYear, month - 1, Number(m[1])));
  }

  m = line.match(DATE_ABBR_RE);
  if (m) {
    const month = parseMonthName(m[2]);
    if (month) return new Date(Date.UTC(m[3] ? Number(m[3]) : referenceYear, month - 1, Number(m[1])));
  }

  m = line.match(DATE_SLASH_RE);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const year = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : referenceYear;
      return new Date(Date.UTC(year, month - 1, day));
    }
  }

  return null;
}

function parseGenericPDFText(rawText: string): ParsedTransaction[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0 && !IGNORED_LINE_RE.test(l));

  const referenceYear = new Date().getUTCFullYear();
  const results: ParsedTransaction[] = [];

  let currentDate: Date | null = null;
  let pendingDescription = "";
  let rowIndex = 0;

  for (const line of lines) {
    const date = extractGenericDate(line, referenceYear);
    if (date) {
      currentDate = date;
      pendingDescription = "";
      continue;
    }

    const amountMatch = line.match(RS_AMOUNT_RE);
    if (amountMatch && currentDate) {
      const amount = Number(amountMatch[2].replace(/\./g, "").replace(",", "."));
      const before = line.slice(0, amountMatch.index).trim();
      const description = before || pendingDescription || "Lançamento sem descrição";

      if (!Number.isNaN(amount) && amount > 0) {
        const negative = amountMatch[1] === "-";
        results.push({
          date: currentDate,
          description,
          amount,
          flow: negative ? "SAIDA" : "ENTRADA",
          externalId: `pdf:${hashRow([currentDate.toISOString(), description, amount, negative ? "SAIDA" : "ENTRADA", rowIndex++])}`,
        });
      }
      pendingDescription = "";
      continue;
    }

    pendingDescription = line;
  }

  return results;
}

export function parseStatementPDFText(rawText: string): ParsedTransaction[] {
  const results = isNubankStatement(rawText) ? parseNubankPDFText(rawText) : parseGenericPDFText(rawText);

  if (results.length === 0) {
    throw new StatementParseError(
      "Não conseguimos reconhecer lançamentos nesse PDF. Confira se é o extrato exportado direto do app do banco (com datas e valores em R$)."
    );
  }

  return results;
}

export async function parseStatementPDF(data: Uint8Array): Promise<ParsedTransaction[]> {
  // unpdf empacota uma build do PDF.js feita pra ambiente serverless (sem
  // depender de canvas nativo) — o pacote "pdf-parse" puxa @napi-rs/canvas,
  // que não carrega nas funções serverless da Vercel e quebra a extração.
  const { getDocumentProxy, extractText } = await import("unpdf");
  try {
    const pdf = await getDocumentProxy(data);
    const { text } = await extractText(pdf, { mergePages: true });
    return parseStatementPDFText(text);
  } catch (e) {
    if (e instanceof StatementParseError) throw e;
    throw new StatementParseError("Não conseguimos ler esse arquivo PDF. Confira se ele não está corrompido ou protegido por senha.");
  }
}
