"use client";

import { useState, useTransition } from "react";
import { pagarComissao } from "@/app/actions/comissoes";

export function PagarComissaoButton({
  professionalId,
  professionalName,
  competencia,
  total,
}: {
  professionalId: string;
  professionalName: string;
  competencia: string;
  total: number;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");

  const valor = total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="text-right">
      <button
        type="button"
        disabled={pendente || total <= 0}
        onClick={() => {
          // Confirmação porque a ação lança despesa no financeiro e fecha o
          // mês do profissional — desfazer dá trabalho.
          if (!confirm(`Pagar ${valor} de comissão para ${professionalName}?\n\nIsso lança a despesa no Financeiro e fecha esses atendimentos.`)) return;
          setErro("");
          iniciar(async () => {
            try {
              await pagarComissao(professionalId, competencia);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não foi possível pagar.");
            }
          });
        }}
        className="text-[11px] font-semibold text-white bg-navy rounded-lg px-3 py-2 disabled:opacity-40 whitespace-nowrap"
      >
        {pendente ? "Pagando..." : "Pagar comissão"}
      </button>
      {erro && <p className="text-[10px] text-red-500 mt-1">{erro}</p>}
    </div>
  );
}
