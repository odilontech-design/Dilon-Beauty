"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";

// Mesma paleta categórica usada em FinanceiroCharts, pra manter os dois
// gráficos de "receita/despesa por categoria" com a mesma linguagem visual.
const SLICE_COLORS = ["#03254C", "#00B8A0", "#3DA5FF", "#FFC247", "#FF8FA3", "#A855F7", "#00A878"];

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type CategorySpend = {
  name: string;
  total: number;
  pct: number;
  growthPct: number | null; // null = categoria não teve gasto no mês anterior (sem base de comparação)
  isLeak: boolean; // cresceu >= 30% em relação ao mês anterior
};

function OwnerBreakdown({ title, data, accentClass }: { title: string; data: CategorySpend[]; accentClass: string }) {
  const top = data.slice(0, 6);
  const leaks = data.filter((d) => d.isLeak);

  return (
    <Card>
      <div className={`text-[11px] font-semibold mb-3 ${accentClass}`}>{title}</div>

      {data.length === 0 ? (
        <div className="h-[160px] flex items-center justify-center text-xs text-gray-400">
          Nenhuma saída classificada esse mês ainda.
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(120, top.length * 34)}>
            <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 10, fill: "#5B7085" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "#F4F9FE" }}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                formatter={(value) => [currency(Number(value)), "Saída"]}
              />
              <Bar dataKey="total" radius={[0, 6, 6, 0]} maxBarSize={18} isAnimationActive={false}>
                {top.map((entry, i) => (
                  <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="mt-3 space-y-1.5">
            {data.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[11px] gap-2">
                <span className="text-gray-500 truncate">{d.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {d.isLeak && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                      🔺 vazamento
                    </span>
                  )}
                  <span className="text-gray-400">{d.pct.toFixed(0)}%</span>
                  <span className="font-semibold text-navy w-20 text-right">{currency(d.total)}</span>
                </div>
              </div>
            ))}
          </div>

          {leaks.length > 0 && (
            <p className="text-[10px] text-red-500 mt-3 leading-relaxed">
              {leaks.length === 1 ? "Essa categoria cresceu" : "Essas categorias cresceram"} 30% ou mais em relação
              ao mês passado — vale entender o motivo antes que vire hábito.
            </p>
          )}
        </>
      )}
    </Card>
  );
}

export function CashFlowDiagnostics({ pj, pf }: { pj: CategorySpend[]; pf: CategorySpend[] }) {
  return (
    <div>
      <h2 className="font-display font-extrabold text-lg text-navy mb-0.5">Onde o dinheiro está indo</h2>
      <p className="text-[11px] text-gray-500 mb-3">
        Saídas do mês por categoria, separadas por conta. Às vezes o problema não é falta de faturamento — é vazamento.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <OwnerBreakdown title="Pessoa Jurídica (CNPJ)" data={pj} accentClass="text-teal-600" />
        <OwnerBreakdown title="Pessoa Física (CPF)" data={pf} accentClass="text-purple-600" />
      </div>
    </div>
  );
}
