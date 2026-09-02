"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/dashboard", icon: "◈", label: "Dashboard" },
  { href: "/agenda", icon: "📅", label: "Agenda" },
  { href: "/clientes", icon: "◉", label: "Clientes" },
  { href: "/financeiro", icon: "◐", label: "Financeiro" },
  { href: "/comissoes", icon: "🤝", label: "Comissões" },
  { href: "/estoque", icon: "📦", label: "Estoque" },
  { href: "/configuracoes", icon: "⚙️", label: "Configurações" },
];

export function Sidebar({
  salonName,
  salonPlan,
  logoUrl,
}: {
  salonName: string;
  salonPlan: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Barra fixa no topo, só em telas pequenas — dá acesso ao menu sem ocupar espaço permanente */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-navyDeep text-white flex items-center gap-3 px-4 z-40">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="text-xl leading-none"
        >
          ☰
        </button>
        {logoUrl && <img src={logoUrl} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />}
        <div className="font-display font-bold text-sm truncate">{salonName}</div>
      </div>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`
          bg-navyDeep text-white flex flex-col shrink-0 h-screen fixed md:sticky top-0 z-50
          transition-all duration-200 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          ${collapsed ? "md:w-16" : "md:w-56"} w-64
        `}
      >
        <div className="p-4 border-b border-white/10 flex items-center gap-2.5 min-h-[76px]">
          {logoUrl && (
            <img src={logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
          )}
          <div className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
            <div className="font-display font-bold text-sm truncate">{salonName}</div>
            <div className="text-[10px] text-white/50 mt-0.5">Dilon Tech · Painel do Dono</div>
            <div className="text-[9px] uppercase tracking-wide mt-2" style={{ color: "#00F5D4" }}>
              Plano {salonPlan.toLowerCase()}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="md:hidden ml-auto text-white/60 hover:text-white text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-2 overflow-y-auto">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg mb-0.5 text-xs transition-colors ${
                  active ? "bg-white/10 text-teal-300 font-semibold" : "text-white/60 hover:bg-white/5"
                } ${collapsed ? "md:justify-center" : ""}`}
                style={active ? { color: "#00F5D4" } : undefined}
              >
                <span>{item.icon}</span>
                <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:block py-2.5 text-white/40 hover:text-white/70 border-t border-white/10 text-[11px]"
        >
          {collapsed ? "»" : "« Recolher menu"}
        </button>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Sair" : undefined}
            className={`w-full text-xs text-white/60 hover:text-white/90 px-3 py-2 ${
              collapsed ? "md:text-center md:px-0" : "text-left"
            }`}
          >
            {collapsed ? "↩" : "↩ Sair"}
          </button>
        </div>
      </div>
    </>
  );
}
