import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Card } from "@/components/ui";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export default async function ConfiguracoesPage() {
  const tenant = await requireTenant();

  const salon = await prisma.salon.findUnique({ where: { id: tenant.salonId } });
  if (!salon) return null;

  const host = headers().get("host") ?? "dilonbeauty.com.br";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const bookingLink = `${protocol}://${host}/agendar/${salon.slug}`;

  return (
    <div>
      <h1 className="font-display font-extrabold text-xl text-navy mb-6">Configurações</h1>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <div className="text-sm font-semibold text-navy mb-3">🔗 Link de agendamento</div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-xs text-teal-700 font-mono mb-2 break-all">
            {bookingLink}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-500">
              Compartilhe esse link na bio do Instagram e no WhatsApp para suas clientes agendarem sozinhas.
            </p>
            <CopyLinkButton text={bookingLink} />
          </div>
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
        </Card>
      </div>
    </div>
  );
}
