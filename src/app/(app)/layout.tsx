import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { Sidebar } from "@/components/Sidebar";

// Toda página dentro deste grupo é dinâmica (dados por sessão),
// nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();
  const salon = await prisma.salon.findUnique({
    where: { id: tenant.salonId },
    select: { logoUrl: true },
  });

  return (
    <div className="flex">
      <Sidebar salonName={tenant.salonName} salonPlan={tenant.salonPlan} logoUrl={salon?.logoUrl ?? null} />
      <main className="flex-1 min-h-screen overflow-y-auto overflow-x-hidden p-4 pt-20 md:p-8">{children}</main>
    </div>
  );
}
