"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", icon: "◈", label: "Dashboard" },
  { href: "/agenda", icon: "📅", label: "Agenda" },
  { href: "/clientes", icon: "◉", label: "Clientes" },
  { href: "/financeiro", icon: "◐", label: "Financeiro" },
  { href: "/configuracoes", icon: "⚙️", label: "Configurações" },
];

export function Sidebar({
  salonName,
  salonPlan,
}: {
  salonName: string;
  salonPlan: string;
}) {
  const pathname = usePathname();

  return (
    <div className="w-56 h-screen bg-navyDeep text-white flex flex-col shrink-0">
      <div className="p-4 border-b border-white/10">
        <div className="font-display font-bold text-sm">{salonName}</div>
        <div className="text-[10px] text-white/50 mt-0.5">Dilon Tech · Painel do Dono</div>
        <div className="text-[9px] uppercase tracking-wide text-teal-300 mt-2" style={{ color: "#00F5D4" }}>
          Plano {salonPlan.toLowerCase()}
        </div>
      </div>

      <nav className="flex-1 p-2 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-xs transition-colors ${
                active ? "bg-white/10 text-teal-300 font-semibold" : "text-white/60 hover:bg-white/5"
              }`}
              style={active ? { color: "#00F5D4" } : undefined}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-xs text-white/60 hover:text-white/90 text-left px-3 py-2"
        >
          ↩ Sair
        </button>
      </div>
    </div>
  );
}
