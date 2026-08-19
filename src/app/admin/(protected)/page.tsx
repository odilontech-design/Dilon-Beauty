import { prisma } from "@/lib/prisma";
import { adminLogout } from "@/app/actions/admin";
import { NewSalonModal } from "./NewSalonModal";
import { EditSalonModal } from "./EditSalonModal";
import { PLAN_PRICES } from "@/lib/pricing";

const PLAN_LABELS: Record<string, string> = {
  STARTER: "Starter",
  PROFISSIONAL: "Profissional",
  CLINIC: "Clinic",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { q?: string; plan?: string; status?: string };
}) {
  const q = (searchParams.q ?? "").trim();
  const planFilter = searchParams.plan ?? "";
  const statusFilter = searchParams.status ?? "";

  const allSalons = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { email: true, name: true }, orderBy: { createdAt: "asc" } },
      _count: { select: { clients: true, appointments: true } },
    },
  });

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  function trialInfo(s: (typeof allSalons)[number]) {
    if (!s.active) return { label: "Desativado", color: "#9CA3AF", onTrial: false, expired: false };
    if (s.trialEndsAt) {
      const daysLeft = Math.ceil((s.trialEndsAt.getTime() - now.getTime()) / 86400000);
      if (daysLeft > 0) return { label: `Trial (${daysLeft}d restantes)`, color: "#E0930A", onTrial: true, expired: false };
      return { label: "Trial vencido", color: "#E03150", onTrial: true, expired: true };
    }
    return { label: "Ativo", color: "#00A878", onTrial: false, expired: false };
  }

  // Métricas gerais — sobre TODOS os salões, não afetadas pelos filtros da lista abaixo.
  const activeCount = allSalons.filter((s) => s.active).length;
  const trialCount = allSalons.filter((s) => trialInfo(s).onTrial && !trialInfo(s).expired).length;
  const newThisWeek = allSalons.filter((s) => s.createdAt >= weekAgo).length;
  const mrr = allSalons.reduce((sum, s) => {
    const info = trialInfo(s);
    if (!s.active || info.onTrial) return sum;
    return sum + (PLAN_PRICES[s.plan] ?? 0);
  }, 0);

  const filtered = allSalons.filter((s) => {
    if (planFilter && s.plan !== planFilter) return false;
    if (statusFilter === "active" && !s.active) return false;
    if (statusFilter === "inactive" && s.active) return false;
    if (statusFilter === "trial" && !(trialInfo(s).onTrial && !trialInfo(s).expired)) return false;
    if (q) {
      const needle = q.toLowerCase();
      const haystack = `${s.name} ${s.slug} ${s.users[0]?.email ?? ""}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Painel administrativo</h1>
          <p className="text-xs text-gray-500 mt-1">{allSalons.length} salões cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <NewSalonModal />
          <form action={adminLogout}>
            <button className="text-xs font-semibold text-gray-500 hover:text-gray-700">Sair</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Kpi label="MRR (pagantes)" value={mrr.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
        <Kpi label="Salões ativos" value={String(activeCount)} />
        <Kpi label="Em trial" value={String(trialCount)} />
        <Kpi label="Novos essa semana" value={String(newThisWeek)} />
      </div>

      <form className="flex flex-wrap items-center gap-2 mb-4" method="get">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, slug ou e-mail..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-xs flex-1 min-w-[200px]"
        />
        <select name="plan" defaultValue={planFilter} className="border border-gray-200 rounded-lg px-3 py-2 text-xs">
          <option value="">Todos os planos</option>
          <option value="STARTER">Starter</option>
          <option value="PROFISSIONAL">Profissional</option>
          <option value="CLINIC">Clinic</option>
        </select>
        <select name="status" defaultValue={statusFilter} className="border border-gray-200 rounded-lg px-3 py-2 text-xs">
          <option value="">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Desativados</option>
          <option value="trial">Em trial</option>
        </select>
        <button type="submit" className="bg-navy text-white text-xs font-semibold rounded-lg py-2 px-4">
          Filtrar
        </button>
        {(q || planFilter || statusFilter) && (
          <a href="/admin" className="text-xs text-gray-500 hover:underline">Limpar</a>
        )}
      </form>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="py-3 px-4 font-semibold">Salão</th>
              <th className="font-semibold">Dono</th>
              <th className="font-semibold">Plano</th>
              <th className="font-semibold">Status</th>
              <th className="font-semibold">Clientes</th>
              <th className="font-semibold">Agendamentos</th>
              <th className="font-semibold">Criado em</th>
              <th className="font-semibold">Link público</th>
              <th className="font-semibold pr-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const info = trialInfo(s);
              return (
                <tr key={s.id} className="border-b border-gray-50">
                  <td className="py-3 px-4 font-semibold text-navy">{s.name}</td>
                  <td className="text-gray-500">{s.users[0]?.email ?? "—"}</td>
                  <td>
                    <span className="text-[10px] font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                      {PLAN_LABELS[s.plan] ?? s.plan}
                    </span>
                  </td>
                  <td>
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: `${info.color}20`, color: info.color }}>
                      {info.label}
                    </span>
                  </td>
                  <td>{s._count.clients}</td>
                  <td>{s._count.appointments}</td>
                  <td className="text-gray-500">{s.createdAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                  <td>
                    <a
                      href={`/agendar/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold hover:underline"
                      style={{ color: "#00B8A0" }}
                    >
                      /agendar/{s.slug}
                    </a>
                  </td>
                  <td className="pr-4">
                    <EditSalonModal
                      salon={{
                        id: s.id,
                        name: s.name,
                        plan: s.plan,
                        active: s.active,
                        trialEndsAt: s.trialEndsAt ? s.trialEndsAt.toISOString().slice(0, 10) : null,
                      }}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gray-400">
                  Nenhum salão encontrado com esse filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4">
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className="text-lg font-display font-extrabold text-navy">{value}</div>
    </div>
  );
}
