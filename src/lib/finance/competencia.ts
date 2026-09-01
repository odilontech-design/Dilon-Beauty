// Competência = mês de referência do lançamento, no formato "YYYY-MM".
//
// É guardada como string (e não como Date) de propósito: competência é um mês,
// não um instante. Guardar como data reabriria o problema de fuso que já deu
// dor de cabeça na agenda — um lançamento de competência setembro virando
// agosto dependendo de onde o servidor roda. Como string, "2026-09" é "2026-09"
// em qualquer lugar, ordena alfabeticamente na ordem certa e filtra com um
// simples `=`.

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const COMPETENCIA_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isCompetencia(value: string): boolean {
  return COMPETENCIA_REGEX.test(value);
}

/** "2026-09-15" ou Date → "2026-09". */
export function competenciaFromDate(date: Date | string): string {
  if (typeof date === "string") {
    // Já vem no formato "YYYY-MM-DD" do <input type="date">; corta direto pra
    // não passar por Date e arriscar deslocamento de fuso.
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 7);
    return competenciaFromDate(new Date(date));
  }
  return date.toISOString().slice(0, 7);
}

/** "2026-09" → "setembro/2026". */
export function formatCompetencia(competencia: string): string {
  if (!isCompetencia(competencia)) return competencia || "—";
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1]}/${ano}`;
}

/** "2026-09" → "set/26", pra caber em coluna de tabela. */
export function formatCompetenciaCurta(competencia: string): string {
  if (!isCompetencia(competencia)) return competencia || "—";
  const [ano, mes] = competencia.split("-");
  return `${MESES[Number(mes) - 1].slice(0, 3)}/${ano.slice(2)}`;
}

/** Desloca a competência em N meses: ("2026-01", -1) → "2025-12". */
export function shiftCompetencia(competencia: string, months: number): string {
  const [ano, mes] = competencia.split("-").map(Number);
  // Date.UTC normaliza a virada de ano sozinho (mês 12 → janeiro do ano seguinte).
  const d = new Date(Date.UTC(ano, mes - 1 + months, 1));
  return d.toISOString().slice(0, 7);
}

/** Primeiro instante do mês, em UTC — pra comparar com campos DateTime. */
export function competenciaToDateRange(competencia: string): { start: Date; end: Date } {
  const [ano, mes] = competencia.split("-").map(Number);
  return {
    start: new Date(Date.UTC(ano, mes - 1, 1)),
    end: new Date(Date.UTC(ano, mes, 1)),
  };
}
