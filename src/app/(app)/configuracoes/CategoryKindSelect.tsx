"use client";

import { useState, useTransition } from "react";
import { setCategoryKind } from "@/app/actions/financeiro";
import type { FinanceCategoryKind } from "@prisma/client";

const OPCOES: { value: FinanceCategoryKind; label: string }[] = [
  { value: "FIXA", label: "Fixa" },
  { value: "VARIAVEL", label: "Variável" },
  { value: "IMPOSTO", label: "Imposto" },
  { value: "DIVIDA", label: "Dívida" },
  { value: "RETIRADA", label: "Retirada" },
];

/**
 * Salva na hora da troca — é um ajuste de uma escolha só, e obrigar a clicar
 * em "salvar" pra cada categoria numa lista de vinte seria trabalhoso à toa.
 */
export function CategoryKindSelect({ id, kind }: { id: string; kind: FinanceCategoryKind }) {
  const [valor, setValor] = useState(kind);
  const [pendente, iniciar] = useTransition();

  return (
    <select
      value={valor}
      disabled={pendente}
      onChange={(e) => {
        const novo = e.target.value as FinanceCategoryKind;
        setValor(novo);
        iniciar(() => setCategoryKind(id, novo));
      }}
      aria-label="Tipo da categoria"
      className="border border-gray-200 rounded-lg px-1.5 py-1 text-[10px] text-gray-600 disabled:opacity-50"
    >
      {OPCOES.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
