import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { BookingForm } from "./BookingForm";

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
    <div className="min-h-screen bg-navyDeep px-4 py-10 flex justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="font-display font-extrabold text-2xl text-white">{salon.name}</div>
          <p className="text-sm text-white/60 mt-1">Agende seu horário online</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          {canBook ? (
            <BookingForm
              slug={salon.slug}
              professionals={salon.professionals.map((p) => ({ id: p.id, name: p.name, role: p.role }))}
              services={salon.services.map((s) => ({ id: s.id, name: s.name, price: s.price }))}
              whatsapp={salon.whatsapp}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center">
              Esse salão ainda não configurou profissionais ou serviços para agendamento online.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
