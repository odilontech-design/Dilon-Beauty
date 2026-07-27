import { prisma } from "@/lib/prisma";

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// Usado tanto pela agenda interna quanto pelo link público de agendamento
// pra impedir que dois agendamentos do mesmo profissional se sobreponham,
// considerando a duração de cada serviço (não só o horário de início).
export async function hasConflict(
  salonId: string,
  professionalId: string,
  date: Date,
  time: string,
  durationMin: number,
  excludeAppointmentId?: string
): Promise<boolean> {
  const dayAppointments = await prisma.appointment.findMany({
    where: {
      salonId,
      professionalId,
      date,
      status: { not: "CANCELADO" },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
    include: { service: true },
  });

  const start = toMinutes(time);
  const end = start + durationMin;

  return dayAppointments.some((appt) => {
    const otherStart = toMinutes(appt.time);
    const otherEnd = otherStart + (appt.service?.durationMin ?? 60);
    return start < otherEnd && otherStart < end;
  });
}
