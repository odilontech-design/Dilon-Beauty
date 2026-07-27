"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui";

const STATUS_COLORS: Record<string, string> = {
  AGUARDANDO: "#FFC247",
  CONFIRMADO: "#00B8A0",
  CONCLUIDO: "#00A878",
  CANCELADO: "#B9C3CF",
};
const STATUS_LABELS: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  CONFIRMADO: "Confirmado",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

export function DashboardCharts({
  weekData,
  statusData,
}: {
  weekData: { day: string; total: number }[];
  statusData: { status: string; count: number }[];
}) {
  const pieData = statusData.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? "#B9C3CF",
  }));
  const hasPieData = pieData.some((d) => d.value > 0);

  return (
    <div className="grid grid-cols-2 gap-4 mb-6">
      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Agendamentos nos últimos 7 dias</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9AB2CC" }} axisLine={false} tickLine={false} interval={0} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9AB2CC" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "#F4F9FE" }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }}
              formatter={(value) => [value, "Agendamentos"]}
            />
            <Bar dataKey="total" fill="#03254C" radius={[6, 6, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div className="text-sm font-semibold text-navy mb-3">Status (últimos 7 dias)</div>
        {hasPieData ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2} isAnimationActive={false}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E5E7EB" }} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-xs text-gray-400">
            Sem agendamentos nos últimos 7 dias.
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-center mt-1">
          {pieData.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: entry.color }} />
              {entry.name} ({entry.value})
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
