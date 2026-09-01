import { Card } from "@/components/ui";
import { marcarComoPago, setMetaCaixa } from "@/app/actions/financeiro";
import type { Disponibilidade as DisponibilidadeType } from "@/lib/finance/analise";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type Compromisso = {
  id: string;
  description: string;
  amount: number;
  flow: "ENTRADA" | "SAIDA";
  owner: "PF" | "PJ";
  dueDate: string; // ISO
  diasRestantes: number;
};

/**
 * "Saldo não é dinheiro livre" (ponto 5 da apostila): mostra o saldo, desconta
 * o que já está comprometido e só então diz quanto sobra de verdade.
 */
export function Disponibilidade({
  dados,
  compromissos,
  metaCaixa,
}: {
  dados: DisponibilidadeType;
  compromissos: Compromisso[];
  metaCaixa: number | null;
}) {
  const faltaParaMeta = metaCaixa ? metaCaixa - dados.disponivel : null;
  const apagar = compromissos.filter((c) => c.flow === "SAIDA");
  const areceber = compromissos.filter((c) => c.flow === "ENTRADA");

  return (
    <Card>
      <div className="text-sm font-semibold text-navy mb-1">Saldo x dinheiro livre</div>
      <p className="text-[11px] text-gray-500 mb-4">
        Saldo da empresa hoje, menos o que já está comprometido.
      </p>

      <div className="flex items-center justify-between py-2 border-b border-gray-100">
        <span className="text-xs text-gray-500">Saldo acumulado (CNPJ)</span>
        <span className="text-sm font-bold text-navy">{currency(dados.saldo)}</span>
      </div>
      <div className="flex items-center justify-between py-1.5 border-b border-gray-50">
        <span className="text-[11px] text-gray-500">(−) Contas a pagar</span>
        <span className="text-xs text-red-500">{currency(dados.aPagar)}</span>
      </div>

      <div className="flex items-center justify-between py-2.5 border-t-2 border-gray-200 mt-1">
        <div>
          <div className="text-xs font-bold text-navy">= Dinheiro livre de verdade</div>
          {dados.aReceber > 0 && (
            <div className="text-[10px] text-gray-400">
              + {currency(dados.aReceber)} a receber, ainda não contados
            </div>
          )}
        </div>
        <span className={`text-base font-extrabold ${dados.disponivel >= 0 ? "text-green-600" : "text-red-500"}`}>
          {currency(dados.disponivel)}
        </span>
      </div>

      {/* Passo 6 do método: a meta de reserva */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-[11px] font-semibold text-gray-500 mb-2">Meta de reserva de caixa</div>
        <form action={setMetaCaixa} className="flex gap-2">
          <input
            name="metaCaixa"
            defaultValue={metaCaixa ? String(metaCaixa).replace(".", ",") : ""}
            inputMode="decimal"
            placeholder="Ex: 10.000"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs"
          />
          <button type="submit" className="bg-navy text-white text-xs font-semibold rounded-lg px-3 py-2">
            Salvar
          </button>
        </form>
        {metaCaixa && faltaParaMeta !== null && (
          <p className="text-[11px] mt-2" style={{ color: faltaParaMeta <= 0 ? "#00A878" : "#E0930A" }}>
            {faltaParaMeta <= 0
              ? `Meta batida — você está ${currency(Math.abs(faltaParaMeta))} acima dela.`
              : `Faltam ${currency(faltaParaMeta)} pra chegar na meta.`}
          </p>
        )}
      </div>

      {/* Passo 5: os próximos 30 dias */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="text-[11px] font-semibold text-gray-500 mb-2">Próximos 30 dias</div>

        {compromissos.length === 0 ? (
          <p className="text-[11px] text-gray-400">
            Nada cadastrado a vencer. Lance as contas que já sabe que vêm aí — é o que evita o susto no fim do mês.
          </p>
        ) : (
          <div className="space-y-1">
            {apagar.concat(areceber).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-50">
                <div className="min-w-0">
                  <div className="text-[11px] text-navy truncate">{c.description}</div>
                  <div className="text-[10px] text-gray-400">
                    {c.owner} ·{" "}
                    {c.diasRestantes < 0
                      ? `venceu há ${Math.abs(c.diasRestantes)}d`
                      : c.diasRestantes === 0
                        ? "vence hoje"
                        : `em ${c.diasRestantes}d`}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[11px] font-semibold ${c.flow === "ENTRADA" ? "text-green-600" : "text-red-500"}`}>
                    {c.flow === "ENTRADA" ? "+" : "-"} {currency(c.amount)}
                  </span>
                  <form action={marcarComoPago.bind(null, c.id)}>
                    <button
                      className="text-[10px] font-semibold hover:underline whitespace-nowrap"
                      style={{ color: "#00B8A0" }}
                    >
                      {c.flow === "ENTRADA" ? "Recebi" : "Paguei"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
