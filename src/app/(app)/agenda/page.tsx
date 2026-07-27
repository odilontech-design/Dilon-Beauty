import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card, StatusBadge } from "@/components/ui";
import { createAppointment, updateAppointmentStatus } from "@/app/actions/agenda";

export default async function AgendaPage() {
  const tenant = await requireTenant();

  const [appointments, clients, professionals, services] = await Promise.all([
    prisma.appointment.findMany({
      where: { salonId: tenant.salonId },
      include: { client: true, professional: true, service: true },
      orderBy: [{ date: "desc" }, { time: "asc" }],
      take: 30,
    }),
    prisma.client.findMany({ where: { salonId: tenant.salonId }, orderBy: { name: "asc" } }),
    prisma.professional.findMany({ where: { salonId: tenant.salonId, active: true } }),
    prisma.service.findMany({ where: { salonId: tenant.salonId } }),
  ]);

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-6">Agenda</h1>

      <div className="grid grid-cols-[1fr_320px] gap-6">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Próximos agendamentos</div>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 font-semibold">Data</th>
                <th className="font-semibold">Hora</th>
                <th className="font-semibold">Cliente</th>
                <th className="font-semibold">Serviço</th>
                <th className="font-semibold">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-gray-50">
                  <td className="py-2.5">{a.date.toLocaleDateString("pt-BR")}</td>
                  <td className="font-bold text-navy">{a.time}</td>
                  <td>{a.client.name}</td>
                  <td className="text-gray-400">{a.service.name}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td>
                    {a.status !== "CONCLUIDO" && a.status !== "CANCELADO" && (
                      <form action={updateAppointmentStatus.bind(null, a.id, "CONCLUIDO")}>
                        <button className="text-[10px] font-semibold text-teal-700 hover:underline">
                          Marcar concluído
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Nenhum agendamento ainda. Cadastre o primeiro ao lado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-navy mb-3">Novo agendamento</div>
          <form action={createAppointment} className="space-y-3">
            <Field label="Cliente">
              <select name="clientId" required className="input">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Profissional">
              <select name="professionalId" required className="input">
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Serviço">
              <select name="serviceId" required className="input">
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — R$ {s.price.toFixed(2)}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Data">
                <input type="date" name="date" required className="input" />
              </Field>
              <Field label="Hora">
                <input type="time" name="time" required className="input" />
              </Field>
            </div>
            <button type="submit" className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 mt-2">
              Agendar
            </button>
            {(clients.length === 0 || professionals.length === 0 || services.length === 0) && (
              <p className="text-[10px] text-blush" style={{ color: "#C0526E" }}>
                Cadastre ao menos 1 cliente, profissional e serviço para poder agendar.
              </p>
            )}
          </form>
        </Card>
      </div>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
