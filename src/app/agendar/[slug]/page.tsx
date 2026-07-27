import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookingForm } from "./BookingForm";
import { AgendarShell } from "./AgendarShell";

// Página pública — não passa por requireTenant(). O isolamento aqui vem
// de resolver o salão pelo slug da URL e nunca aceitar um salonId externo.
export const dynamic = "force-dynamic";

export default async function AgendarPage({ params }: { params: { slug: string } }) {
  const salon = await prisma.salon.findUnique({
    where: { slug: params.slug },
    include: {
      professionals: { where: { active: true }, orderBy: { name: "asc" } },
      services: { where: { active: true }, orderBy: { name: "asc" } },
    },
  });

  if (!salon) notFound();

  const canBook = salon.professionals.length > 0 && salon.services.length > 0;

  return (
    <AgendarShell salonName={salon.name}>
      {canBook ? (
        <BookingForm
          slug={salon.slug}
          salonName={salon.name}
          professionals={salon.professionals.map((p) => ({ id: p.id, name: p.name, role: p.role }))}
          services={salon.services.map((s) => ({ id: s.id, name: s.name, price: s.price, durationMin: s.durationMin }))}
          whatsapp={salon.whatsapp}
        />
      ) : (
        <p className="text-sm text-gray-500 text-center">
          Esse salão ainda não configurou profissionais ou serviços para agendamento online.
        </p>
      )}
    </AgendarShell>
  );
}
