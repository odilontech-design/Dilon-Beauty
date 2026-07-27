import { requireTenant } from "@/lib/tenant";
import { Sidebar } from "@/components/Sidebar";

// Toda página dentro deste grupo é dinâmica (dados por sessão),
// nunca deve ser pré-renderizada estaticamente no build.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const tenant = await requireTenant();

  return (
    <div className="flex">
      <Sidebar salonName={tenant.salonName} salonPlan={tenant.salonPlan} />
      <main className="flex-1 min-h-screen overflow-y-auto p-8">{children}</main>
    </div>
  );
}
