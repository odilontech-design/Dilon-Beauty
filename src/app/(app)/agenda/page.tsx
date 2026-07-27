import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, StatusBadge } from "@/components/ui";
import { updateAppointmentStatus } from "@/app/actions/agenda";
import { todayUTCDate, startOfWeekUTC, addDaysUTC, dateToISO } from "@/lib/date";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { NewAppointmentModal } from "./NewAppointmentModal";
import { RescheduleButton } from "./RescheduleButton";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const tenant = await requireTenant();

  const requested = searchParams.date ? new Date(searchParams.date) : null;
  const selectedDate = requested && !Number.isNaN(requested.getTime()) ? requested : todayUTCDate();
  const selectedISO = dateToISO(selectedDate);

  const weekStart = startOfWeekUTC(selectedDate);
  const weekEnd = addDaysUTC(weekStart, 7);

  const [weekAppointments, dayAppointments, clients, professionals, services] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: { gte: weekStart, lt: weekEnd } },
      select: { date: true },
    }),
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: selectedDate },
      include: { client: true, professional: true, service: true },
      orderBy: { time: "asc" },
    }),
    prisma.client.findMany({ where: { salonId: tenant.salonId }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { salonId: tenant.salonId, active: true } }),
    prisma.service.findMany({ where: { salonId: tenant.salonId, active: true } }),
  ]);

  const countByDay: Record<string, number> = {};
  weekAppointments.forEach((a) => {
    const key = dateToISO(a.date);
    countByDay[key] = (countByDay[key] ?? 0) + 1;
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));
  const dayTotal = dayAppointments
    .filter((a) => a.status !== "CANCELADO")
    .reduce((sum, a) => sum + a.price, 0);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Agenda</h1>
          <p className="text-xs text-gray-500 mt-1">
            {dayAppointments.length} agendamentos · {dayTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </p>
        </div>
        <NewAppointmentModal
          defaultDate={selectedISO}
          clients={clients.map((c) => ({ id: c.id, label: c.name }))}
          professionals={professionals.map((p) => ({ id: p.id, label: p.name }))}
          services={services.map((s) => ({ id: s.id, label: `${s.name} — R$ ${s.price.toFixed(2)}` }))}
        />
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {weekDays.map((d) => {
          const iso = dateToISO(d);
          const isSelected = iso === selectedISO;
          const weekday = d.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" }).replace(".", "");
          const dayNum = d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" });
          return (
            <Link
              key={iso}
              href={`/agenda?date=${iso}`}
              className={`shrink-0 rounded-xl border px-3 py-2 text-center min-w-[76px] transition-colors ${
                isSelected ? "text-white border-transparent" : "bg-white border-gray-200 text-navy hover:border-gray-300"
              }`}
              style={isSelected ? { background: "#00B8A0" } : undefined}
            >
              <div className="text-[10px] font-semibold uppercase opacity-80">{weekday}</div>
              <div className="text-lg font-extrabold leading-tight">{dayNum}</div>
              <div className="text-[9px] opacity-80">{countByDay[iso] ?? 0} agend.</div>
            </Link>
          );
        })}
      </div>

      <Card>
        {dayAppointments.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-6">Nenhum agendamento nesse dia.</p>
        )}
        <div className="divide-y divide-gray-50">
          {dayAppointments.map((a) => {
            const canChange = a.status !== "CONCLUIDO" && a.status !== "CANCELADO";
            return (
              <div key={a.id} className="flex items-center gap-4 py-3">
                <div className="w-14 shrink-0">
                  <div className="font-bold text-navy text-sm">{a.time}</div>
                  <div className="text-[10px] text-gray-400">{a.service.durationMin}min</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy text-sm">{a.client.name}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <div className="text-xs text-gray-400 truncate">
                    {a.service.name} · {a.professional.name}
                  </div>
                </div>
                <div className="font-bold text-navy text-sm shrink-0">
                  {a.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <WhatsAppButton
                    phone={a.client.phone}
                    message={`Olá ${a.client.name}! Aqui é do ${tenant.salonName}.`}
                  />
                  {canChange && (
                    <>
                      <RescheduleButton appointmentId={a.id} currentDate={selectedISO} currentTime={a.time} />
                      <form action={updateAppointmentStatus.bind(null, a.id, "CONCLUIDO")}>
                        <button className="text-[10px] font-semibold text-teal-700 hover:underline">
                          Marcar concluído
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
