"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";

const SLICE_COLORS = ["#03254C", "#00B8A0", "#3DA5FF", "#FFC247", "#FF8FA3", "#A855F7", "#00A878"];

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function FinanceiroCharts({
  dailyRevenue,
  revenueByService,
}: {
  dailyRevenue: { day: string; total: number }[];
  revenueByService: { name: string; total: number }[];
}) {
  const hasServiceData = revenueByService.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Receita por dia (mês atual)</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={dailyRevenue} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9AB2CC" }} axisLine={false} tickLine={false} interval={2} />
            <YAxis
              tick={{ fontSize: 11, fill: "#9AB2CC" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${Math.round(v)}`}
            />
            <Tooltip
              cursor={{ fill: "#F4F9FE" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
              formatter={(value) => [currency(Number(value)), "Receita"]}
            />
            <Bar dataKey="total" fill="#00B8A0" radius={[6, 6, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Receita por serviço (mês atual)</div>
        {hasServiceData ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={revenueByService} dataKey="total" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                {revenueByService.map((entry, i) => (
                  <Cell key={entry.name} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
                formatter={(value) => currency(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">
            Nenhum atendimento concluído esse mês ainda.
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-1">
          {revenueByService.map((entry, i) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }} />
              {entry.name} ({currency(entry.total)})
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
