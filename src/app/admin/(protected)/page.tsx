import { prisma } from "@/lib/prisma";
import { adminLogout } from "@/app/actions/admin";
import { NewSalonModal } from "./NewSalonModal";

export default async function AdminPage() {
  const salons = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: { select: { email: true, name: true } },
      _count: { select: { clients: true, appointments: true, professionals: true, services: true } },
    },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-extrabold text-xl text-navy">Painel administrativo</h1>
          <p className="text-xs text-gray-500 mt-1">{salons.length} salões cadastrados</p>
        </div>
        <div className="flex items-center gap-3">
          <NewSalonModal />
          <form action={adminLogout}>
            <button className="text-xs font-semibold text-gray-500 hover:text-gray-700">Sair</button>
          </form>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100 bg-gray-50">
              <th className="py-3 px-4 font-semibold">Salão</th>
              <th className="font-semibold">Dono</th>
              <th className="font-semibold">WhatsApp</th>
              <th className="font-semibold">Plano</th>
              <th className="font-semibold">Clientes</th>
              <th className="font-semibold">Agendamentos</th>
              <th className="font-semibold">Criado em</th>
              <th className="font-semibold pr-4">Link público</th>
            </tr>
          </thead>
          <tbody>
            {salons.map((s) => (
              <tr key={s.id} className="border-b border-gray-50">
                <td className="py-3 px-4 font-semibold text-navy">{s.name}</td>
                <td className="text-gray-500">{s.users[0]?.email ?? "—"}</td>
                <td className="text-gray-500">{s.whatsapp ?? "—"}</td>
                <td>
                  <span className="text-[10px] font-semibold uppercase bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    {s.plan}
                  </span>
                </td>
                <td>{s._count.clients}</td>
                <td>{s._count.appointments}</td>
                <td className="text-gray-500">{s.createdAt.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                <td className="pr-4">
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
              </tr>
            ))}
            {salons.length === 0 && (
              <tr>
                <td colSpan={8} className="py-8 text-center text-gray-400">
                  Nenhum salão cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
