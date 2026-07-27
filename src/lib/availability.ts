import { prisma } from "@/lib/prisma";
import { todayDateStrInSalonTZ, currentMinutesInSalonTZ } from "@/lib/date";

const SLOT_STEP_MIN = 15;

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(totalMin: number): string {
  const h = Math.floor(totalMin / 60)
    .toString()
    .padStart(2, "0");
  const m = (totalMin % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

// Gera os horários de início livres pra um profissional num dia, dado o
// horário de funcionamento do salão e a duração do serviço escolhido —
// um horário só entra na lista se o serviço inteiro (início + duração)
// couber sem esbarrar em outro agendamento já existente daquele profissional.
export async function getAvailableTimes({
  salonId,
  professionalId,
  date,
  dateStr,
  durationMin,
  openTime,
  closeTime,
}: {
  salonId: string;
  professionalId: string;
  date: Date;
  dateStr: string;
  durationMin: number;
  openTime: string;
  closeTime: string;
}): Promise<string[]> {
  const dayAppointments = await prisma.appointment.findMany({
    where: { salonId, professionalId, date, status: { not: "CANCELADO" } },
    include: { service: true },
  });

  const busy = dayAppointments.map((a) => {
    const start = toMinutes(a.time);
    return { start, end: start + (a.service?.durationMin ?? 60) };
  });

  const openMin = toMinutes(openTime);
  const closeMin = toMinutes(closeTime);
  const isToday = dateStr === todayDateStrInSalonTZ();
  const nowMin = isToday ? currentMinutesInSalonTZ() : -1;

  const slots: string[] = [];
  for (let start = openMin; start + durationMin <= closeMin; start += SLOT_STEP_MIN) {
    if (start <= nowMin) continue;
    const end = start + durationMin;
    const conflicts = busy.some((b) => start < b.end && b.start < end);
    if (!conflicts) slots.push(toHHMM(start));
  }
  return slots;
}
