import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { createClient } from "@/app/actions/clientes";
import { ClientRow } from "./ClientRow";

export default async function ClientesPage() {
  const tenant = await requireTenant();

  const clients = await prisma.client.findMany({
    where: { salonId: tenant.salonId },
    include: { appointments: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-6">Clientes</h1>

      <div className="grid grid-cols-[1fr_280px] gap-6">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">{clients.length} clientes cadastradas</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Nome</th>
                <th className="font-semibold">WhatsApp</th>
                <th className="font-semibold">Atendimentos</th>
                <th className="font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <ClientRow
                  key={c.id}
                  salonName={tenant.salonName}
                  client={{
                    id: c.id,
                    name: c.name,
                    phone: c.phone,
                    notes: c.notes,
                    appointmentsCount: c.appointments.length,
                  }}
                />
              ))}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
                    Nenhuma cliente cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Nova cliente</div>
          <form action={createClient} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Nome</label>
              <input name="name" required className="input" placeholder="Nome da cliente" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">WhatsApp</label>
              <input name="phone" className="input" placeholder="21 90000-0000" />
            </div>
            <button type="submit" className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 mt-1">
              Cadastrar
            </button>
          </form>
        </Card>
      </div>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </div>
  );
}
