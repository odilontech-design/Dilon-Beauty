import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, Kpi } from "@/components/ui";
import { setProductActive } from "@/app/actions/estoque";
import { NovoProdutoModal } from "./NovoProdutoModal";
import { MovimentoModal } from "./MovimentoModal";

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const qtd = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2).replace(".", ","));

const TIPO_LABEL: Record<string, string> = {
  ENTRADA: "Entrada",
  SAIDA: "Saída",
  AJUSTE: "Ajuste",
};

export default async function EstoquePage() {
  const tenant = await requireTenant();

  const [produtos, movimentos] = await Promise.all([
    prisma.product.findMany({
      where: { salonId: tenant.salonId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
    prisma.stockMovement.findMany({
      where: { salonId: tenant.salonId },
      include: { product: { select: { name: true, unit: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);

  const ativos = produtos.filter((p) => p.active);
  // Produto zerado é um caso mais grave que "abaixo do mínimo" e aparece
  // separado, senão some no meio da lista de alertas.
  const zerados = ativos.filter((p) => p.quantity <= 0);
  const abaixoDoMinimo = ativos.filter((p) => p.quantity > 0 && p.minQuantity > 0 && p.quantity <= p.minQuantity);
  const valorEmEstoque = ativos.reduce((s, p) => s + p.quantity * p.costPrice, 0);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Estoque</h1>
          <p className="text-xs text-gray-500 mt-1">{ativos.length} produtos ativos</p>
        </div>
        <NovoProdutoModal />
      </div>

      <p className="text-[11px] text-gray-400 mb-6">
        Todo movimento fica registrado — o saldo é a soma das entradas e saídas, não um número digitado à mão.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Kpi label="Valor parado em estoque" value={currency(valorEmEstoque)} sub="quantidade × custo" />
        <Kpi label="Precisam de reposição" value={String(abaixoDoMinimo.length)} sub="chegaram no mínimo" />
        <Kpi label="Zerados" value={String(zerados.length)} sub="acabaram" />
      </div>

      {(zerados.length > 0 || abaixoDoMinimo.length > 0) && (
        <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-6">
          <strong>Hora de comprar:</strong>{" "}
          {[...zerados, ...abaixoDoMinimo].map((p) => `${p.name} (${qtd(p.quantity)} ${p.unit})`).join(" · ")}
        </div>
      )}

      <Card className="mb-6">
        <div className="text-sm font-semibold text-navy mb-3">Produtos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Produto</th>
                <th className="font-semibold">Saldo</th>
                <th className="font-semibold">Mínimo</th>
                <th className="font-semibold">Custo un.</th>
                <th className="font-semibold">Valor em estoque</th>
                <th className="font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => {
                const zerado = p.active && p.quantity <= 0;
                const baixo = p.active && !zerado && p.minQuantity > 0 && p.quantity <= p.minQuantity;
                return (
                  <tr key={p.id} className="border-b border-gray-50">
                    <td className="py-2.5">
                      <span className={`font-medium ${p.active ? "text-navy" : "text-gray-400 line-through"}`}>
                        {p.name}
                      </span>
                      {zerado && (
                        <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          zerado
                        </span>
                      )}
                      {baixo && (
                        <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                          repor
                        </span>
                      )}
                    </td>
                    <td className="font-semibold text-navy whitespace-nowrap">
                      {qtd(p.quantity)} {p.unit}
                    </td>
                    <td className="text-gray-400 whitespace-nowrap">
                      {p.minQuantity > 0 ? `${qtd(p.minQuantity)} ${p.unit}` : "—"}
                    </td>
                    <td className="text-gray-500">{currency(p.costPrice)}</td>
                    <td className="text-gray-500">{currency(p.quantity * p.costPrice)}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        {p.active && (
                          <MovimentoModal
                            produto={{
                              id: p.id,
                              name: p.name,
                              unit: p.unit,
                              quantity: p.quantity,
                              costPrice: p.costPrice,
                            }}
                          />
                        )}
                        <form action={setProductActive.bind(null, p.id, !p.active)}>
                          <button
                            className="text-[11px] font-semibold hover:underline whitespace-nowrap"
                            style={{ color: p.active ? "#C0526E" : "#00B8A0" }}
                          >
                            {p.active ? "Desativar" : "Reativar"}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    Nenhum produto cadastrado. Comece pelos que você mais usa no dia a dia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Últimas movimentações</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Quando</th>
                <th className="font-semibold">Produto</th>
                <th className="font-semibold">Tipo</th>
                <th className="font-semibold">Quantidade</th>
                <th className="font-semibold">Observação</th>
              </tr>
            </thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id} className="border-b border-gray-50">
                  <td className="py-2 text-gray-500 whitespace-nowrap">
                    {m.createdAt.toLocaleDateString("pt-BR")} {m.createdAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td>{m.product.name}</td>
                  <td>
                    <span
                      className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                        m.type === "ENTRADA"
                          ? "bg-green-100 text-green-700"
                          : m.type === "SAIDA"
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {TIPO_LABEL[m.type]}
                    </span>
                  </td>
                  <td className="font-semibold text-navy whitespace-nowrap">
                    {m.type === "SAIDA" ? "−" : m.type === "ENTRADA" ? "+" : "="} {qtd(m.quantity)} {m.product.unit}
                  </td>
                  <td className="text-gray-400">{m.notes ?? "—"}</td>
                </tr>
              ))}
              {movimentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Nenhuma movimentação ainda.
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
