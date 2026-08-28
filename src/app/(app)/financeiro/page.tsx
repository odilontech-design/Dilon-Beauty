import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi, StatusBadge } from "@/components/ui";
import { todayUTCDate, addDaysUTC, startOfMonthUTCDate } from "@/lib/date";
import { FinanceiroCharts } from "./FinanceiroCharts";
import { listCategories } from "@/app/actions/financeiro";
import { TransactionRow } from "./TransactionRow";
import { NewTransactionForm } from "./NewTransactionForm";
import { CashFlowDiagnostics, type CategorySpend } from "./CashFlowDiagnostics";
import type { FinanceOwner } from "@prisma/client";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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

  // ── Controle de caixa PF x PJ (extratos importados + lançamentos manuais) ──
  const categories = await listCategories();
  const monthTransactions = await prisma.financeTransaction.findMany({
    where: { salonId: tenant.salonId, date: { gte: startOfMonth } },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const totalsByOwner = { PJ: { entrada: 0, saida: 0 }, PF: { entrada: 0, saida: 0 } };
  for (const t of monthTransactions) {
    totalsByOwner[t.owner][t.flow === "ENTRADA" ? "entrada" : "saida"] += t.amount;
  }

  // ── Diagnóstico "onde o dinheiro está indo" ────────────────────────────
  // Saídas por categoria do mês atual, comparadas com o mês anterior pra
  // sinalizar categorias que dispararam (o "vazamento" que o dono não vê
  // olhando só o saldo do banco).
  const prevMonthStart = new Date(Date.UTC(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() - 1, 1));
  const prevMonthTransactions = await prisma.financeTransaction.findMany({
    where: { salonId: tenant.salonId, flow: "SAIDA", date: { gte: prevMonthStart, lt: startOfMonth } },
    include: { category: true },
  });

  function buildCategorySpend(owner: FinanceOwner): CategorySpend[] {
    const currentByCategory = new Map<string, number>();
    monthTransactions
      .filter((t) => t.owner === owner && t.flow === "SAIDA")
      .forEach((t) => {
        const name = t.category?.name ?? "Sem categoria";
        currentByCategory.set(name, (currentByCategory.get(name) ?? 0) + t.amount);
      });

    const previousByCategory = new Map<string, number>();
    prevMonthTransactions
      .filter((t) => t.owner === owner)
      .forEach((t) => {
        const name = t.category?.name ?? "Sem categoria";
        previousByCategory.set(name, (previousByCategory.get(name) ?? 0) + t.amount);
      });

    const total = Array.from(currentByCategory.values()).reduce((s, v) => s + v, 0);

    return Array.from(currentByCategory.entries())
      .map(([name, catTotal]) => {
        const previousTotal = previousByCategory.get(name) ?? 0;
        const growthPct = previousTotal > 0 ? ((catTotal - previousTotal) / previousTotal) * 100 : null;
        const isLeak = previousTotal > 0 && catTotal >= 50 && growthPct !== null && growthPct >= 30;
        return {
          name,
          total: catTotal,
          pct: total > 0 ? (catTotal / total) * 100 : 0,
          growthPct,
          isLeak,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  const pjCategorySpend = buildCategorySpend("PJ");
  const pfCategorySpend = buildCategorySpend("PF");

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

      <div className="flex items-center justify-between mt-10 mb-3">
        <div>
          <h2 className="font-display font-extrabold text-lg text-navy">Controle de Caixa · PF x PJ</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Separe a conta da empresa (CNPJ) da conta pessoal do dono (CPF) — assim você sabe se o negócio deu lucro real.
          </p>
        </div>
        <Link
          href="/financeiro/importar"
          className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2.5 shrink-0"
        >
          Importar extrato
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-[11px] font-semibold text-teal-600 mb-2">Pessoa Jurídica (CNPJ)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-gray-400">Entradas no mês</div>
              <div className="text-sm font-bold text-green-600">{currency(totalsByOwner.PJ.entrada)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Saídas no mês</div>
              <div className="text-sm font-bold text-red-500">{currency(totalsByOwner.PJ.saida)}</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
            Saldo: <strong className="text-navy">{currency(totalsByOwner.PJ.entrada - totalsByOwner.PJ.saida)}</strong>
          </div>
        </Card>
        <Card>
          <div className="text-[11px] font-semibold text-purple-600 mb-2">Pessoa Física (CPF)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-gray-400">Entradas no mês</div>
              <div className="text-sm font-bold text-green-600">{currency(totalsByOwner.PF.entrada)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Saídas no mês</div>
              <div className="text-sm font-bold text-red-500">{currency(totalsByOwner.PF.saida)}</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
            Saldo: <strong className="text-navy">{currency(totalsByOwner.PF.entrada - totalsByOwner.PF.saida)}</strong>
          </div>
        </Card>
      </div>

      <CashFlowDiagnostics pj={pjCategorySpend} pf={pfCategorySpend} />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Lançamentos do mês</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="py-2 font-semibold">Data</th>
                  <th className="font-semibold">Descrição</th>
                  <th className="font-semibold">Conta</th>
                  <th className="font-semibold">Categoria</th>
                  <th className="font-semibold">Valor</th>
                  <th className="font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {monthTransactions.map((t) => (
                  <TransactionRow
                    key={t.id}
                    categories={categories}
                    transaction={{
                      id: t.id,
                      date: t.date.toISOString(),
                      description: t.description,
                      amount: t.amount,
                      flow: t.flow,
                      owner: t.owner,
                      categoryId: t.categoryId,
                      categoryName: t.category?.name ?? null,
                      source: t.source,
                    }}
                  />
                ))}
                {monthTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-gray-400">
                      Nenhum lançamento esse mês. Importe um extrato ou lance manualmente.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Lançar manualmente</div>
          <NewTransactionForm categories={categories} />
        </Card>
      </div>
    </div>
  );
}
