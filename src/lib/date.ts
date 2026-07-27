// Datas de agendamento são salvas como meia-noite UTC do dia escolhido
// (é como `new Date("YYYY-MM-DD")` sempre interpreta uma string de data pura).
// O servidor pode rodar em fusos diferentes entre dev (máquina local) e
// produção (Vercel, UTC) — se "hoje" ou a exibição da data usassem o fuso
// ambiente do processo, um agendamento podia aparecer um dia adiantado ou
// atrasado dependendo de onde o código está rodando. Por isso fixamos o
// fuso dos salões (Brasil) aqui em vez de depender do fuso do servidor.
const SALON_TIMEZONE = "America/Sao_Paulo";

function todayPartsInSalonTZ() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SALON_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { year: Number(map.year), month: Number(map.month), day: Number(map.day) };
}

export function todayUTCDate(): Date {
  const { year, month, day } = todayPartsInSalonTZ();
  return new Date(Date.UTC(year, month - 1, day));
}

export function startOfMonthUTCDate(): Date {
  const { year, month } = todayPartsInSalonTZ();
  return new Date(Date.UTC(year, month - 1, 1));
}

export function addDaysUTC(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function formatDateBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
