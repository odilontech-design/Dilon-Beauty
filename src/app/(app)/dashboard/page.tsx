import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi, StatusBadge } from "@/components/ui";
import { todayUTCDate, addDaysUTC } from "@/lib/date";
import { DashboardCharts } from "./DashboardCharts";

export default async function DashboardPage() {
  const tenant = await requireTenant();

  const startOfDay = todayUTCDate();
  const endOfDay = addDaysUTC(startOfDay, 1);
  const weekStart = addDaysUTC(startOfDay, -6);

  // Toda leitura filtrada por salonId — é o que separa os dados de cada cliente.
  const [todayAppts, weekAppts] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: { gte: startOfDay, lt: endOfDay } },
      include: { client: true, professional: true, service: true },
      orderBy: { time: "asc" },
    }),
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: { gte: weekStart, lt: endOfDay } },
      select: { date: true, status: true },
    }),
  ]);

  const revenue = todayAppts
    .filter((a) => a.status === "CONCLUIDO")
    .reduce((sum, a) => sum + a.price, 0);
  const pending = todayAppts.filter((a) => a.status === "AGUARDANDO").length;

  const days = Array.from({ length: 7 }, (_, i) => addDaysUTC(weekStart, i));
  const countByKey = Object.fromEntries(days.map((d) => [d.toISOString().slice(0, 10), 0]));
  weekAppts.forEach((a) => {
    const key = a.date.toISOString().slice(0, 10);
    if (key in countByKey) countByKey[key]++;
  });
  const weekData = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return { day: d.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "short" }), total: countByKey[key] };
  });

  const statusCounts: Record<string, number> = { AGUARDANDO: 0, CONFIRMADO: 0, CONCLUIDO: 0, CANCELADO: 0 };
  weekAppts.forEach((a) => {
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  });
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-1">
        Olá, {tenant.userName.split(" ")[0]} 👋
      </h1>
      <p className="text-sm text-gray-500 mb-6">Aqui está o resumo do seu dia em {tenant.salonName}.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Agendamentos hoje" value={String(todayAppts.length)} />
        <Kpi label="Receita do dia" value={revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Kpi label="Aguardando confirmação" value={String(pending)} />
      </div>

      <DashboardCharts weekData={weekData} statusData={statusData} />

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Agenda de hoje</div>
        {todayAppts.length === 0 && (
          <p className="text-xs text-gray-400">Nenhum agendamento para hoje ainda.</p>
        )}
        <div className="divide-y divide-gray-100">
          {todayAppts.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-2.5 text-xs">
              <span className="font-bold text-navy w-12">{a.time}</span>
              <span className="flex-1">{a.client.name}</span>
              <span className="text-gray-400 flex-1">{a.service.name} · {a.professional.name}</span>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
