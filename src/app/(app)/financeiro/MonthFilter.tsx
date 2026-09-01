"use client";

import { useRouter } from "next/navigation";
import { formatCompetencia, shiftCompetencia } from "@/lib/finance/competencia";

/**
 * Navega entre competências pela URL (?comp=YYYY-MM), igual ao filtro de dia da
 * agenda: o mês vive na URL, então a página continua sendo renderizada no
 * servidor e o link do mês pode ser compartilhado ou favoritado.
 */
export function MonthFilter({
  current,
  available,
}: {
  current: string;
  available: string[];
}) {
  const router = useRouter();

  function irPara(competencia: string) {
    router.push(`/financeiro?comp=${competencia}`);
  }

  // O seletor lista os meses que têm lançamento, mas as setas andam livremente:
  // dá pra visitar um mês vazio (e ver que está vazio) sem ficar preso à lista.
  const opcoes = available.includes(current) ? available : [current, ...available];

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => irPara(shiftCompetencia(current, -1))}
        aria-label="Mês anterior"
        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm"
      >
        ‹
      </button>

      <select
        value={current}
        onChange={(e) => irPara(e.target.value)}
        aria-label="Competência"
        className="border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-navy bg-white capitalize min-w-[150px]"
      >
        {opcoes.map((c) => (
          <option key={c} value={c}>
            {formatCompetencia(c)}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => irPara(shiftCompetencia(current, 1))}
        aria-label="Próximo mês"
        className="w-8 h-8 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 text-sm"
      >
        ›
      </button>
    </div>
  );
}
