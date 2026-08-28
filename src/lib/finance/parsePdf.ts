import { hashRow } from "./hash";
import { StatementParseError, type ParsedTransaction } from "./parse";

const MONTHS: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

// Extratos em PDF (ex: o extrato que o app do Nubank gera) não têm colunas
// fixas como um CSV — é texto solto, linha por linha. O formato mais comum é:
//   14 de agosto de 2026        (ou "14 AGO", cabeçalho de data)
//   Compra no débito - Mercado X
//   -R$ 45,90
// Por isso o parser varre linha a linha guardando a última data e a última
// linha "não-valor" como descrição, e fecha um lançamento sempre que encontra
// uma linha com um valor em R$.
const DATE_FULL_RE = /^(?:[a-zçãé]+,\s*)?(\d{1,2})\s+de\s+([a-zçã]{3,})\.?(?:\s+de\s+(\d{4}))?$/i;
const DATE_ABBR_RE = /^(\d{1,2})\s+([a-zçã]{3})\.?(?:\s+(\d{4}))?$/i;
const DATE_SLASH_RE = /^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/;
const AMOUNT_RE = /(-?)\s*R\$\s*(\d{1,3}(?:\.\d{3})*,\d{2})\s*$/;
const IGNORED_LINE_RE = /^--\s*\d+\s+of\s+\d+\s*--$/i; // marcador de página do pdf-parse

function parseMonthName(raw: string): number | null {
  const abbr = raw.slice(0, 3).toLowerCase();
  return MONTHS[abbr] ?? null;
}

function extractDate(line: string, referenceYear: number): Date | null {
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

export function parseStatementPDFText(rawText: string): ParsedTransaction[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !IGNORED_LINE_RE.test(l));

  const referenceYear = new Date().getUTCFullYear();
  const results: ParsedTransaction[] = [];

  let currentDate: Date | null = null;
  let pendingDescription = "";
  let rowIndex = 0;

  for (const line of lines) {
    const date = extractDate(line, referenceYear);
    if (date) {
      currentDate = date;
      pendingDescription = "";
      continue;
    }

    const amountMatch = line.match(AMOUNT_RE);
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

  if (results.length === 0) {
    throw new StatementParseError(
      "Não conseguimos reconhecer lançamentos nesse PDF. Confira se é o extrato exportado direto do app do banco (com datas e valores em R$)."
    );
  }

  return results;
}

export async function parseStatementPDF(data: Uint8Array): Promise<ParsedTransaction[]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return parseStatementPDFText(result.text);
  } catch (e) {
    if (e instanceof StatementParseError) throw e;
    throw new StatementParseError("Não conseguimos ler esse arquivo PDF. Confira se ele não está corrompido ou protegido por senha.");
  } finally {
    await parser.destroy();
  }
}
