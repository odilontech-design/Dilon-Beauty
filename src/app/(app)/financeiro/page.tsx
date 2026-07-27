import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi, StatusBadge } from "@/components/ui";
import { todayUTCDate, addDaysUTC, startOfMonthUTCDate } from "@/lib/date";
import { FinanceiroCharts } from "./FinanceiroCharts";

export default async function FinanceiroPage() {
  const tenant = await requireTenant();

  const startOfMonth = startOfMonthUTCDate();
  const startOfDay = todayUTCDate();
  const endOfDay = addDaysUTC(startOfDay, 1);

  const [monthAppts, todayAppts] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: { gte: startOfMonth }, status: "CONCLUIDO" },
      include: { service: true },
    }),
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, date: { gte: startOfDay, lt: endOfDay } },
      include: { client: true, service: true },
      orderBy: { time: "asc" },
    }),
  ]);

  const monthRevenue = monthAppts.reduce((s, a) => s + a.price, 0);
  const todayRevenue = todayAppts
    .filter((a) => a.status === "CONCLUIDO")
    .reduce((s, a) => s + a.price, 0);
  const avgTicket = monthAppts.length ? monthRevenue / monthAppts.length : 0;

  const daysSoFar = Math.floor((todayUTCDate().getTime() - startOfMonth.getTime()) / 86400000) + 1;
  const monthDays = Array.from({ length: daysSoFar }, (_, i) => addDaysUTC(startOfMonth, i));
  const revenueByKey: Record<string, number> = Object.fromEntries(monthDays.map((d) => [d.toISOString().slice(0, 10), 0]));
  monthAppts.forEach((a) => {
    const key = a.date.toISOString().slice(0, 10);
    if (key in revenueByKey) revenueByKey[key] += a.price;
  });
  const dailyRevenue = monthDays.map((d) => {
    const key = d.toISOString().slice(0, 10);
    return { day: d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" }), total: revenueByKey[key] };
  });

  const revenueByServiceMap = new Map<string, number>();
  monthAppts.forEach((a) => {
    const name = a.service.name;
    revenueByServiceMap.set(name, (revenueByServiceMap.get(name) ?? 0) + a.price);
  });
  const revenueByService = Array.from(revenueByServiceMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-6">Financeiro</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Receita hoje" value={todayRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Kpi label="Receita do mês" value={monthRevenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} sub={`${monthAppts.length} atendimentos concluídos`} />
        <Kpi label="Ticket médio" value={avgTicket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
      </div>

      <FinanceiroCharts dailyRevenue={dailyRevenue} revenueByService={revenueByService} />

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Extrato de hoje</div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[420px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-semibold">Hora</th>
              <th className="font-semibold">Cliente</th>
              <th className="font-semibold">Serviço</th>
              <th className="font-semibold">Valor</th>
              <th className="font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {todayAppts.map((a) => (
              <tr key={a.id} className="border-b border-gray-50">
                <td className="py-2.5 font-bold text-navy">{a.time}</td>
                <td>{a.client.name}</td>
                <td className="text-gray-400">{a.service.name}</td>
                <td className="font-semibold">
                  {a.status === "CANCELADO" ? "—" : a.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </td>
                <td><StatusBadge status={a.status} /></td>
              </tr>
            ))}
            {todayAppts.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-400">Nenhum movimento hoje.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
