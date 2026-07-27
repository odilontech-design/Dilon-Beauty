"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "dilon-beauty-agendar-theme";

// Card interno fica sempre branco (bom contraste nos dois modos) — só o
// fundo da página e o cabeçalho mudam. Estado inicia em "dark" (igual ao
// que o servidor renderiza) pra não piscar tema errado no primeiro load;
// só troca depois se a visitante já tinha escolhido "light" antes.
export function AgendarShell({
  salonName,
  logoUrl,
  children,
}: {
  salonName: string;
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const dark = theme === "dark";

  return (
    <div
      className={`min-h-screen px-4 py-8 sm:py-10 flex justify-center transition-colors ${
        dark ? "bg-navyDeep" : "bg-gray-50"
      }`}
    >
      <div className="w-full max-w-md relative">
        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? "Ativar modo claro" : "Ativar modo escuro"}
          className={`absolute -top-1 right-0 w-9 h-9 rounded-full flex items-center justify-center text-base transition-colors ${
            dark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-navy/10 hover:bg-navy/20 text-navy"
          }`}
        >
          {dark ? "☀️" : "🌙"}
        </button>

        <div className="text-center mb-6 px-10">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={salonName}
              className="w-14 h-14 rounded-xl object-cover mx-auto mb-2 border border-white/10"
            />
          )}
          <div className={`font-display font-extrabold text-xl sm:text-2xl break-words ${dark ? "text-white" : "text-navy"}`}>
            {salonName}
          </div>
          <p className={`text-sm mt-1 ${dark ? "text-white/60" : "text-gray-500"}`}>Agende seu horário online</p>
        </div>

        <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}
