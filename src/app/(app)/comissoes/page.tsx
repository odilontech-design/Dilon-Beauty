import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi } from "@/components/ui";
import { todayDateStrInSalonTZ } from "@/lib/date";
import {
  competenciaToDateRange,
  formatCompetencia,
  isCompetencia,
  shiftCompetencia,
} from "@/lib/finance/competencia";
import { MonthFilter } from "../financeiro/MonthFilter";
import { PercentualInput } from "./PercentualInput";
import { PagarComissaoButton } from "./PagarComissaoButton";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function ComissoesPage({
  searchParams,
}: {
  searchParams: { comp?: string };
}) {
  const tenant = await requireTenant();

  const competenciaAtual = todayDateStrInSalonTZ().slice(0, 7);
  const competencia =
    searchParams.comp && isCompetencia(searchParams.comp) ? searchParams.comp : competenciaAtual;
  const { start, end } = competenciaToDateRange(competencia);

  const [professionals, appointments] = await Promise.all([
    prisma.professional.findMany({
      where: { salonId: tenant.salonId, active: true },
      orderBy: { name: "asc" },
    }),
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId, status: "CONCLUIDO", date: { gte: start, lt: end } },
      include: { service: { select: { name: true, commissionPct: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  // Meses com atendimento concluído, pro seletor não oferecer mês vazio.
  const mesesComDados = await prisma.appointment.findMany({
    where: { salonId: tenant.salonId, status: "CONCLUIDO" },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
    take: 400,
  });
  const competencias = Array.from(
    new Set([competenciaAtual, ...mesesComDados.map((a) => a.date.toISOString().slice(0, 7))])
  ).sort((a, b) => b.localeCompare(a));

  const porProfissional = professionals.map((p) => {
    const seus = appointments.filter((a) => a.professionalId === p.id);
    const aberto = seus.filter((a) => !a.commissionPaid);
    return {
      profissional: p,
      atendimentos: seus.length,
      faturamento: seus.reduce((s, a) => s + a.price, 0),
      comissaoTotal: seus.reduce((s, a) => s + a.commissionAmount, 0),
      comissaoAberta: aberto.reduce((s, a) => s + a.commissionAmount, 0),
      comissaoPaga: seus.filter((a) => a.commissionPaid).reduce((s, a) => s + a.commissionAmount, 0),
      atendimentosAbertos: aberto.length,
      // Serviço com percentual próprio quebra a regra do profissional; sinaliza
      // pra que o número não pareça errado quando não bate com o percentual dele.
      temServicoComRegraPropria: seus.some((a) => a.service.commissionPct !== null),
    };
  });

  const totalFaturamento = porProfissional.reduce((s, p) => s + p.faturamento, 0);
  const totalComissao = porProfissional.reduce((s, p) => s + p.comissaoTotal, 0);
  const totalAberto = porProfissional.reduce((s, p) => s + p.comissaoAberta, 0);
  const semPercentual = professionals.filter((p) => p.commissionPct <= 0).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Comissões</h1>
          <p className="text-xs text-gray-500 mt-1 capitalize">{formatCompetencia(competencia)}</p>
        </div>
        <MonthFilter current={competencia} available={competencias} basePath="/comissoes" />
      </div>

      <p className="text-[11px] text-gray-400 mb-6">
        Calculado sobre os atendimentos <strong>concluídos</strong> do mês. Pagar lança a despesa no Financeiro e
        fecha os atendimentos, pra não pagar duas vezes.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Faturamento do mês" value={currency(totalFaturamento)} sub={`${appointments.length} atendimentos`} />
        <Kpi label="Comissão total" value={currency(totalComissao)} />
        <Kpi label="Em aberto" value={currency(totalAberto)} sub="ainda não pago" />
        <Kpi
          label="Fica com o salão"
          value={currency(totalFaturamento - totalComissao)}
          sub={totalFaturamento > 0 ? `${(100 - (totalComissao / totalFaturamento) * 100).toFixed(0)}% do faturamento` : undefined}
        />
      </div>

      {semPercentual > 0 && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4">
          {semPercentual} profissional{semPercentual > 1 ? "is estão" : " está"} com comissão em 0%. Ajuste o
          percentual abaixo — o valor dos atendimentos já concluídos e ainda não pagos é recalculado na hora.
        </div>
      )}

      <Card className="mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[760px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Profissional</th>
                <th className="font-semibold">Comissão</th>
                <th className="font-semibold">Atendimentos</th>
                <th className="font-semibold">Faturamento</th>
                <th className="font-semibold">A pagar</th>
                <th className="font-semibold">Já pago</th>
                <th className="font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {porProfissional.map((p) => (
                <tr key={p.profissional.id} className="border-b border-gray-50">
                  <td className="py-3 font-semibold text-navy">
                    {p.profissional.name}
                    {p.profissional.role && (
                      <div className="text-[10px] text-gray-400 font-normal">{p.profissional.role}</div>
                    )}
                  </td>
                  <td>
                    <PercentualInput
                      professionalId={p.profissional.id}
                      valor={p.profissional.commissionPct}
                      competencia={competencia}
                    />
                    {p.temServicoComRegraPropria && (
                      <div className="text-[10px] text-gray-400 mt-0.5">alguns serviços têm % próprio</div>
                    )}
                  </td>
                  <td>{p.atendimentos}</td>
                  <td className="text-gray-500">{currency(p.faturamento)}</td>
                  <td className={`font-semibold ${p.comissaoAberta > 0 ? "text-navy" : "text-gray-300"}`}>
                    {currency(p.comissaoAberta)}
                    {p.atendimentosAbertos > 0 && (
                      <div className="text-[10px] text-gray-400 font-normal">
                        {p.atendimentosAbertos} atendimento{p.atendimentosAbertos > 1 ? "s" : ""}
                      </div>
                    )}
                  </td>
                  <td className="text-gray-400">{currency(p.comissaoPaga)}</td>
                  <td>
                    {p.comissaoAberta > 0 && (
                      <PagarComissaoButton
                        professionalId={p.profissional.id}
                        professionalName={p.profissional.name}
                        competencia={competencia}
                        total={p.comissaoAberta}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {professionals.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Nenhum profissional ativo. Cadastre em Configurações.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">
          Atendimentos que compõem o cálculo · <span className="capitalize font-normal text-gray-500">{formatCompetencia(competencia)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[620px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Data</th>
                <th className="font-semibold">Serviço</th>
                <th className="font-semibold">Valor</th>
                <th className="font-semibold">Comissão</th>
                <th className="font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {appointments.slice(0, 60).map((a) => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-500 whitespace-nowrap">
                    {a.date.toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {a.time}
                  </td>
                  <td>{a.service.name}</td>
                  <td className="text-gray-500">{currency(a.price)}</td>
                  <td className="font-semibold text-navy">{currency(a.commissionAmount)}</td>
                  <td>
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                        a.commissionPaid ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {a.commissionPaid ? "pago" : "a pagar"}
                    </span>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Nenhum atendimento concluído em {formatCompetencia(competencia)}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
