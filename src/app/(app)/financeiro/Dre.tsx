import { Card } from "@/components/ui";
import type { Dre as DreType } from "@/lib/finance/analise";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * "Lucro não é faturamento" em forma de tela: desce do que entrou até o que
 * realmente sobrou, mostrando cada grupo de custo que come o caminho.
 */
export function Dre({ dre, periodo }: { dre: DreType; periodo: string }) {
  const linhas = [
    { rotulo: "Mercadorias e custos variáveis", valor: dre.variavel },
    { rotulo: "Custos fixos (estrutura e equipe)", valor: dre.fixa },
    { rotulo: "Impostos", valor: dre.imposto },
    { rotulo: "Dívidas e juros", valor: dre.divida },
    { rotulo: "Sem classificação", valor: dre.semClassificacao, alerta: true },
  ].filter((l) => l.valor > 0);

  const lucroPositivo = dre.lucro >= 0;

  return (
    <Card>
      <div className="text-sm font-semibold text-navy mb-1">Lucro real da empresa</div>
      <p className="text-[11px] text-gray-500 mb-4">
        Só o CNPJ, só o que já foi pago · <span className="capitalize">{periodo}</span>
      </p>

      {dre.faturamento === 0 && dre.custoTotal === 0 ? (
        <p className="text-xs text-gray-400 py-6 text-center">
          Sem movimento da empresa nesse mês. Importe o extrato PJ pra ver o lucro real.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-navy">Faturamento</span>
            <span className="text-sm font-bold text-green-600">{currency(dre.faturamento)}</span>
          </div>

          {linhas.map((l) => (
            <div key={l.rotulo} className="flex items-center justify-between py-1.5 border-b border-gray-50">
              <span className={`text-[11px] ${l.alerta ? "text-amber-700" : "text-gray-500"}`}>
                (−) {l.rotulo}
              </span>
              <span className="text-xs text-red-500">{currency(l.valor)}</span>
            </div>
          ))}

          <div className="flex items-center justify-between py-2.5 mt-1 border-t-2 border-gray-200">
            <div>
              <div className="text-xs font-bold text-navy">= Lucro real</div>
              {dre.margem !== null && (
                <div className="text-[10px] text-gray-400">
                  margem de {dre.margem.toFixed(1).replace(".", ",")}% sobre o faturamento
                </div>
              )}
            </div>
            <span className={`text-base font-extrabold ${lucroPositivo ? "text-green-600" : "text-red-500"}`}>
              {currency(dre.lucro)}
            </span>
          </div>

          {dre.retiradas > 0 && (
            <>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-[11px] text-gray-500">(−) Retirada do dono (pró-labore)</span>
                <span className="text-xs text-purple-600">{currency(dre.retiradas)}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-t border-gray-100">
                <span className="text-[11px] font-semibold text-gray-600">= Sobrou na empresa</span>
                <span className={`text-xs font-bold ${dre.sobra >= 0 ? "text-navy" : "text-red-500"}`}>
                  {currency(dre.sobra)}
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                A retirada sai depois do lucro porque não é custo do negócio — é a sua parte do resultado.
              </p>
            </>
          )}

          {dre.semClassificacao > 0 && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-2 mt-3">
              {currency(dre.semClassificacao)} entrou como custo sem categoria. Classifique pra saber em que grupo
              esse dinheiro está indo.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
