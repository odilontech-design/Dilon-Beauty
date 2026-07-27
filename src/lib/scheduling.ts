import { prisma } from "@/lib/prisma";

// Usado tanto pela agenda interna quanto pelo link público de agendamento
// para impedir que dois agendamentos caiam no mesmo profissional/data/hora.
export async function isSlotTaken(
  salonId: string,
  professionalId: string,
  date: Date,
  time: string
) {
  const existing = await prisma.appointment.findFirst({
    where: {
      salonId,
      professionalId,
      date,
      time,
      status: { not: "CANCELADO" },
    },
    select: { id: true },
  });
  return !!existing;
}
