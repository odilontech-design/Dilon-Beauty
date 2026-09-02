"use client";

import { useState, useTransition } from "react";
import { setCommissionPct, recalcularComissoes } from "@/app/actions/comissoes";

/**
 * Percentual do profissional. Ao salvar, também recalcula as comissões em
 * aberto do mês — senão o dono ajustaria o percentual e continuaria vendo o
 * valor antigo, sem entender por quê.
 */
export function PercentualInput({
  professionalId,
  valor,
  competencia,
}: {
  professionalId: string;
  valor: number;
  competencia: string;
}) {
  const [pct, setPct] = useState(String(valor).replace(".", ","));
  const [pendente, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    const numero = Number(pct.replace(",", "."));
    if (!Number.isFinite(numero) || numero < 0 || numero > 100) return;
    iniciar(async () => {
      await setCommissionPct(professionalId, numero);
      await recalcularComissoes(competencia);
      setSalvo(true);
      setTimeout(() => setSalvo(false), 1500);
    });
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        value={pct}
        onChange={(e) => setPct(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
        }}
        disabled={pendente}
        inputMode="decimal"
        aria-label="Percentual de comissão"
        className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-right disabled:opacity-50"
      />
      <span className="text-[11px] text-gray-400">%</span>
      {salvo && <span className="text-[10px]" style={{ color: "#00A878" }}>salvo</span>}
    </span>
  );
}
