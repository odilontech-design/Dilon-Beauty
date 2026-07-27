import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi, StatusBadge } from "@/components/ui";
import { todayUTCDate, addDaysUTC } from "@/lib/date";

export default async function DashboardPage() {
  const tenant = await requireTenant();

  const startOfDay = todayUTCDate();
  const endOfDay = addDaysUTC(startOfDay, 1);

  // Toda leitura filtrada por salonId — é o que separa os dados de cada cliente.
  const todayAppts = await prisma.appointment.findMany({
    where: { salonId: tenant.salonId, date: { gte: startOfDay, lt: endOfDay } },
    include: { client: true, professional: true, service: true },
    orderBy: { time: "asc" },
  });

  const revenue = todayAppts
    .filter((a) => a.status === "CONCLUIDO")
    .reduce((sum, a) => sum + a.price, 0);
  const pending = todayAppts.filter((a) => a.status === "AGUARDANDO").length;

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-1">
        Olá, {tenant.userName.split(" ")[0]} 👋
      </h1>
      <p className="text-sm text-gray-500 mb-6">Aqui está o resumo do seu dia em {tenant.salonName}.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Kpi label="Agendamentos hoje" value={String(todayAppts.length)} />
        <Kpi label="Receita do dia" value={revenue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Kpi label="Aguardando confirmação" value={String(pending)} />
      </div>

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
