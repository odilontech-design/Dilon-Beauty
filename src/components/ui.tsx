export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-2xl p-5 ${className}`}>{children}</div>
  );
}

export function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className="text-xl font-display font-extrabold text-navy">{value}</div>
      {sub && <div className="text-[10px] text-gray-400 mt-1">{sub}</div>}
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    AGUARDANDO: "bg-yellow-100 text-yellow-700",
    CONFIRMADO: "bg-teal-100 text-teal-700",
    CONCLUIDO: "bg-green-100 text-green-700",
    CANCELADO: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${map[status] ?? "bg-gray-100"}`}>
      {status}
    </span>
  );
}
