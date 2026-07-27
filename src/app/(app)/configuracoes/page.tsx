import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import {
  createProfessional,
  setProfessionalActive,
  createService,
  setServiceActive,
  setBusinessHours,
} from "@/app/actions/config";

export default async function ConfiguracoesPage() {
  const tenant = await requireTenant();

  const [salon, professionals, services] = await Promise.all([
    prisma.salon.findUnique({ where: { id: tenant.salonId } }),
    prisma.professional.findMany({ where: { salonId: tenant.salonId }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ where: { salonId: tenant.salonId }, orderBy: { name: "asc" } }),
  ]);
  if (!salon) return null;

  const host = headers().get("host") ?? "dilonbeauty.com.br";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const bookingLink = `${protocol}://${host}/agendar/${salon.slug}`;
  const qrCodeDataUrl = await QRCode.toDataURL(bookingLink, {
    width: 240,
    margin: 1,
    color: { dark: "#03254C", light: "#FFFFFF" },
  });

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-6">Configurações</h1>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">🔗 Link de agendamento</div>
          <div className="flex flex-col xl:flex-row items-start gap-4">
            <img
              src={qrCodeDataUrl}
              alt={`QR code para agendamento do ${salon.name}`}
              width={96}
              height={96}
              className="rounded-lg border border-gray-200 shrink-0 w-24 h-24 object-contain"
            />
            <div className="flex-1 min-w-0 w-full">
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-teal-700 font-mono mb-2 break-all">
                {bookingLink}
              </div>
              <div className="flex items-center gap-3">
                <CopyLinkButton text={bookingLink} />
                <a
                  href={qrCodeDataUrl}
                  download={`qrcode-agendamento-${salon.slug}.png`}
                  className="text-[11px] font-semibold hover:underline"
                  style={{ color: "#00B8A0" }}
                >
                  Baixar QR Code
                </a>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-500 mt-3">
            Compartilhe o link ou o QR code na bio do Instagram, no WhatsApp ou impresso no salão para suas clientes agendarem sozinhas.
          </p>
          {(professionals.filter((p) => p.active).length === 0 || services.filter((s) => s.active).length === 0) && (
            <p className="text-[11px] mt-2" style={{ color: "#C0526E" }}>
              Cadastre ao menos 1 profissional e 1 serviço ativos abaixo para o link público funcionar.
            </p>
          )}
        </Card>

        <Card>
          <div className="text-sm font-semibold text-navy mb-3">🏪 Dados do salão</div>
          {[
            ["Nome", salon.name],
            ["Plano", salon.plan],
            ["WhatsApp", salon.whatsapp ?? "—"],
            ["Endereço", salon.address ?? "—"],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between py-2 border-b border-gray-50 text-xs">
              <span className="text-gray-500">{l}</span>
              <span className="font-semibold text-navy">{v}</span>
            </div>
          ))}

          <div className="text-[11px] font-semibold text-gray-500 mt-4 mb-2">
            Horário de funcionamento (usado pra calcular os horários livres no link público)
          </div>
          <form action={setBusinessHours} className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-1">Abre</label>
              <input type="time" name="openTime" required defaultValue={salon.openTime} className="input" />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] text-gray-400 mb-1">Fecha</label>
              <input type="time" name="closeTime" required defaultValue={salon.closeTime} className="input" />
            </div>
            <button type="submit" className="bg-navy text-white text-xs font-semibold rounded-lg py-2 px-3">
              Salvar
            </button>
          </form>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">💇 Profissionais</div>
          <div className="space-y-1.5 mb-4">
            {professionals.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                <div>
                  <span className={`font-medium ${p.active ? "text-navy" : "text-gray-400 line-through"}`}>
                    {p.name}
                  </span>
                  {p.role && <span className="text-gray-400"> — {p.role}</span>}
                </div>
                <form action={setProfessionalActive.bind(null, p.id, !p.active)}>
                  <button className="text-[10px] font-semibold text-teal-700 hover:underline" style={{ color: p.active ? "#C0526E" : "#00B8A0" }}>
                    {p.active ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </div>
            ))}
            {professionals.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Nenhum profissional cadastrado ainda.</p>
            )}
          </div>
          <form action={createProfessional} className="space-y-2">
            <input name="name" required className="input" placeholder="Nome do profissional" />
            <input name="role" className="input" placeholder="Função (ex: Cabeleireira)" />
            <button type="submit" className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2">
              Adicionar profissional
            </button>
          </form>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-navy mb-3">✂️ Serviços</div>
          <div className="space-y-1.5 mb-4">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                <div>
                  <span className={`font-medium ${s.active ? "text-navy" : "text-gray-400 line-through"}`}>
                    {s.name}
                  </span>
                  <span className="text-gray-400"> — R$ {s.price.toFixed(2)}</span>
                </div>
                <form action={setServiceActive.bind(null, s.id, !s.active)}>
                  <button className="text-[10px] font-semibold hover:underline" style={{ color: s.active ? "#C0526E" : "#00B8A0" }}>
                    {s.active ? "Desativar" : "Reativar"}
                  </button>
                </form>
              </div>
            ))}
            {services.length === 0 && (
              <p className="text-xs text-gray-400 py-2">Nenhum serviço cadastrado ainda.</p>
            )}
          </div>
          <form action={createService} className="space-y-2">
            <input name="name" required className="input" placeholder="Nome do serviço" />
            <div className="grid grid-cols-2 gap-2">
              <input name="price" type="number" step="0.01" min="0" required className="input" placeholder="Preço (R$)" />
              <input name="durationMin" type="number" min="5" defaultValue={60} className="input" placeholder="Duração (min)" />
            </div>
            <button type="submit" className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2">
              Adicionar serviço
            </button>
          </form>
        </Card>
      </div>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </div>
  );
}
