import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi, StatusBadge } from "@/components/ui";
import { todayUTCDate, addDaysUTC, todayDateStrInSalonTZ } from "@/lib/date";
import { FinanceiroCharts } from "./FinanceiroCharts";
import { listCategories, listCompetencias } from "@/app/actions/financeiro";
import { TransactionRow } from "./TransactionRow";
import { NewTransactionModal } from "./NewTransactionModal";
import { MonthFilter } from "./MonthFilter";
import { CashFlowDiagnostics, type CategorySpend } from "./CashFlowDiagnostics";
import { Dre } from "./Dre";
import { Disponibilidade, type Compromisso } from "./Disponibilidade";
import { MetodoSemanal } from "./MetodoSemanal";
import {
  competenciaToDateRange,
  formatCompetencia,
  isCompetencia,
  shiftCompetencia,
} from "@/lib/finance/competencia";
import { calcularDre, calcularDisponibilidade, montarPassosSemanais } from "@/lib/finance/analise";
import type { FinanceOwner } from "@prisma/client";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: { comp?: string };
}) {
  const tenant = await requireTenant();

  const competenciaAtual = todayDateStrInSalonTZ().slice(0, 7);
  const competencia =
    searchParams.comp && isCompetencia(searchParams.comp) ? searchParams.comp : competenciaAtual;
  const ehMesCorrente = competencia === competenciaAtual;

  const { start: inicioMes, end: fimMes } = competenciaToDateRange(competencia);
  const competenciaAnterior = shiftCompetencia(competencia, -1);

  const startOfDay = todayUTCDate();
  const endOfDay = addDaysUTC(startOfDay, 1);

  const [salon, monthAppts, todayAppts, categories, competencias] = await Promise.all([
    prisma.salon.findUnique({ where: { id: tenant.salonId }, select: { metaCaixa: true } }),
    prisma.appointment.findMany({
      where: {
        salonId: tenant.salonId,
        date: { gte: inicioMes, lt: fimMes },
        status: "CONCLUIDO",
      },
      include: { service: true },
    }),
    // Widget de "hoje" só faz sentido olhando o mês corrente; nos outros meses
    // nem consultamos o banco à toa.
    ehMesCorrente
      ? prisma.appointment.findMany({
          where: { salonId: tenant.salonId, date: { gte: startOfDay, lt: endOfDay } },
          include: { client: true, service: true },
          orderBy: { time: "asc" },
        })
      : Promise.resolve([]),
    listCategories(),
    listCompetencias(competenciaAtual),
  ]);

  const monthRevenue = monthAppts.reduce((s, a) => s + a.price, 0);
  const avgTicket = monthAppts.length ? monthRevenue / monthAppts.length : 0;

  // ── Gráfico de receita por dia ────────────────────────────────────────────
  // No mês corrente para no dia de hoje (o resto do mês ainda não aconteceu);
  // em meses fechados mostra o mês inteiro.
  const diasNoMes = Math.round((fimMes.getTime() - inicioMes.getTime()) / 86400000);
  const diasExibidos = ehMesCorrente
    ? Math.floor((startOfDay.getTime() - inicioMes.getTime()) / 86400000) + 1
    : diasNoMes;
  const monthDays = Array.from({ length: Math.max(diasExibidos, 1) }, (_, i) => addDaysUTC(inicioMes, i));
  const revenueByKey: Record<string, number> = Object.fromEntries(
    monthDays.map((d) => [d.toISOString().slice(0, 10), 0])
  );
  monthAppts.forEach((a) => {
    const key = a.date.toISOString().slice(0, 10);
    if (key in revenueByKey) revenueByKey[key] += a.price;
  });
  const dailyRevenue = monthDays.map((d) => ({
    day: d.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" }),
    total: revenueByKey[d.toISOString().slice(0, 10)],
  }));

  const revenueByServiceMap = new Map<string, number>();
  monthAppts.forEach((a) => {
    revenueByServiceMap.set(a.service.name, (revenueByServiceMap.get(a.service.name) ?? 0) + a.price);
  });
  const revenueByService = Array.from(revenueByServiceMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  // ── Caixa PF x PJ, por competência ────────────────────────────────────────
  const em30Dias = addDaysUTC(startOfDay, 30);
  const seteDiasAtras = addDaysUTC(startOfDay, -7);

  const [monthTransactions, prevMonthTransactions, historicoPago, pendentes, importRecente] =
    await Promise.all([
      prisma.financeTransaction.findMany({
        where: { salonId: tenant.salonId, competencia },
        include: { category: true, import: { select: { bankLabel: true, fileName: true } } },
        orderBy: { date: "desc" },
      }),
      prisma.financeTransaction.findMany({
        where: { salonId: tenant.salonId, competencia: competenciaAnterior, flow: "SAIDA", status: "PAGO" },
        include: { category: true },
      }),
      // Saldo não zera na virada do mês: vem do histórico inteiro da empresa.
      prisma.financeTransaction.findMany({
        where: { salonId: tenant.salonId, owner: "PJ", status: "PAGO" },
        select: { amount: true, flow: true },
      }),
      prisma.financeTransaction.findMany({
        where: { salonId: tenant.salonId, status: "PENDENTE" },
        select: { id: true, description: true, amount: true, flow: true, owner: true, dueDate: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.bankImport.findFirst({
        where: { salonId: tenant.salonId, importedAt: { gte: seteDiasAtras } },
        select: { id: true },
      }),
    ]);

  // Totais do mês contam só o que já passou pelo banco — compromisso que ainda
  // vai vencer não é entrada nem saída, é compromisso.
  const pagosDoMes = monthTransactions.filter((t) => t.status === "PAGO");
  const totalsByOwner = { PJ: { entrada: 0, saida: 0 }, PF: { entrada: 0, saida: 0 } };
  for (const t of pagosDoMes) {
    totalsByOwner[t.owner][t.flow === "ENTRADA" ? "entrada" : "saida"] += t.amount;
  }

  const entradasTotal = totalsByOwner.PJ.entrada + totalsByOwner.PF.entrada;
  const saidasTotal = totalsByOwner.PJ.saida + totalsByOwner.PF.saida;
  const semCategoria = monthTransactions.filter((t) => !t.categoryId).length;

  const dre = calcularDre(
    monthTransactions.map((t) => ({
      amount: t.amount,
      flow: t.flow,
      owner: t.owner,
      status: t.status,
      dueDate: t.dueDate,
      categoryKind: t.category?.kind ?? null,
    }))
  );

  const disponibilidade = calcularDisponibilidade(
    historicoPago,
    pendentes.filter((p) => p.owner === "PJ")
  );

  const compromissos: Compromisso[] = pendentes
    .filter((p) => p.dueDate && p.dueDate < em30Dias)
    .map((p) => ({
      id: p.id,
      description: p.description,
      amount: p.amount,
      flow: p.flow,
      owner: p.owner,
      dueDate: p.dueDate!.toISOString(),
      diasRestantes: Math.round((p.dueDate!.getTime() - startOfDay.getTime()) / 86400000),
    }));

  // ── Diagnóstico "onde o dinheiro está indo" ───────────────────────────────
  // Saídas por categoria comparadas com a competência anterior, pra sinalizar
  // categorias que dispararam — o "vazamento" que não aparece olhando só o
  // saldo do banco.
  function buildCategorySpend(owner: FinanceOwner): CategorySpend[] {
    const atual = new Map<string, number>();
    pagosDoMes
      .filter((t) => t.owner === owner && t.flow === "SAIDA")
      .forEach((t) => {
        const name = t.category?.name ?? "Sem categoria";
        atual.set(name, (atual.get(name) ?? 0) + t.amount);
      });

    const anterior = new Map<string, number>();
    prevMonthTransactions
      .filter((t) => t.owner === owner)
      .forEach((t) => {
        const name = t.category?.name ?? "Sem categoria";
        anterior.set(name, (anterior.get(name) ?? 0) + t.amount);
      });

    const total = Array.from(atual.values()).reduce((s, v) => s + v, 0);

    return Array.from(atual.entries())
      .map(([name, catTotal]) => {
        const previousTotal = anterior.get(name) ?? 0;
        const growthPct = previousTotal > 0 ? ((catTotal - previousTotal) / previousTotal) * 100 : null;
        return {
          name,
          total: catTotal,
          pct: total > 0 ? (catTotal / total) * 100 : 0,
          growthPct,
          isLeak: previousTotal > 0 && catTotal >= 50 && growthPct !== null && growthPct >= 30,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  const pjCategorySpend = buildCategorySpend("PJ");
  const pfCategorySpend = buildCategorySpend("PF");

  const vazamento = pjCategorySpend.find((c) => c.isLeak) ?? pfCategorySpend.find((c) => c.isLeak);
  const passosSemanais = montarPassosSemanais({
    lancamentosNaCompetencia: monthTransactions.length,
    importouRecentemente: !!importRecente,
    semCategoria,
    temVazamento: !!vazamento,
    nomeVazamento: vazamento?.name ?? null,
    compromissos30Dias: compromissos.length,
    metaCaixa: salon?.metaCaixa ?? null,
    disponivel: disponibilidade.disponivel,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Financeiro</h1>
          <p className="text-xs text-gray-500 mt-1 capitalize">{formatCompetencia(competencia)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthFilter current={competencia} available={competencias} />
          <NewTransactionModal categories={categories} />
          <Link
            href="/financeiro/importar"
            className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2.5 whitespace-nowrap"
          >
            Importar extrato
          </Link>
        </div>
      </div>

      <p className="text-[11px] text-gray-400 mb-6">
        Tudo nesta tela segue a <strong>competência</strong> — o mês a que o lançamento se refere, que nem sempre é
        o mês em que o dinheiro saiu do banco.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Faturamento em atendimentos"
          value={currency(monthRevenue)}
          sub={`${monthAppts.length} concluídos · ticket ${currency(avgTicket)}`}
        />
        <Kpi label="Entradas no caixa" value={currency(entradasTotal)} sub="PJ + PF, só o que já entrou" />
        <Kpi label="Saídas no caixa" value={currency(saidasTotal)} sub="PJ + PF, só o que já saiu" />
        <Kpi
          label="Resultado do mês"
          value={currency(entradasTotal - saidasTotal)}
          sub={entradasTotal - saidasTotal >= 0 ? "sobrou" : "faltou"}
        />
      </div>

      <MetodoSemanal passos={passosSemanais} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Dre dre={dre} periodo={formatCompetencia(competencia)} />
        <Disponibilidade
          dados={disponibilidade}
          compromissos={compromissos}
          metaCaixa={salon?.metaCaixa ?? null}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card>
          <div className="text-[11px] font-semibold text-teal-600 mb-2">Pessoa Jurídica (CNPJ)</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-gray-400">Entradas</div>
              <div className="text-sm font-bold text-green-600">{currency(totalsByOwner.PJ.entrada)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Saídas</div>
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
              <div className="text-[10px] text-gray-400">Entradas</div>
              <div className="text-sm font-bold text-green-600">{currency(totalsByOwner.PF.entrada)}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400">Saídas</div>
              <div className="text-sm font-bold text-red-500">{currency(totalsByOwner.PF.saida)}</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-500">
            Saldo: <strong className="text-navy">{currency(totalsByOwner.PF.entrada - totalsByOwner.PF.saida)}</strong>
          </div>
        </Card>
      </div>

      <CashFlowDiagnostics pj={pjCategorySpend} pf={pfCategorySpend} />

      <Card className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-sm font-semibold text-navy">
            Lançamentos · <span className="capitalize font-normal text-gray-500">{formatCompetencia(competencia)}</span>
          </div>
          {semCategoria > 0 && (
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-full px-3 py-1">
              {semCategoria} sem categoria — classifique pra análise ficar correta
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Pagamento</th>
                <th className="font-semibold">Competência</th>
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
                    competencia: t.competencia,
                    description: t.description,
                    amount: t.amount,
                    flow: t.flow,
                    owner: t.owner,
                    status: t.status,
                    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                    categoryId: t.categoryId,
                    categoryName: t.category?.name ?? null,
                    source: t.source,
                    origem: t.import ? t.import.bankLabel || t.import.fileName : null,
                  }}
                />
              ))}
              {monthTransactions.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Nenhum lançamento em {formatCompetencia(competencia)}. Importe um extrato ou lance manualmente.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="font-display font-extrabold text-lg text-navy mb-1">Atendimentos</h2>
      <p className="text-[11px] text-gray-500 mb-3">
        Receita vinda da agenda — serve de referência pra conferir se tudo que foi atendido entrou no caixa.
      </p>

      <FinanceiroCharts
        dailyRevenue={dailyRevenue}
        revenueByService={revenueByService}
        periodo={formatCompetencia(competencia)}
      />

      {ehMesCorrente && (
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Atendimentos de hoje</div>
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
                      {a.status === "CANCELADO" ? "—" : currency(a.price)}
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
      )}
    </div>
  );
}
