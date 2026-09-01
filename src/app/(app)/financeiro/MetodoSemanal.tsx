"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import type { PassoSemanal } from "@/lib/finance/analise";

/**
 * O "método dos 30 minutos" da apostila trazido pra dentro do sistema.
 * Começa recolhido: quem já tem o hábito não precisa do roteiro na cara toda
 * semana, e quem não tem encontra ele ali quando abre.
 */
export function MetodoSemanal({ passos }: { passos: PassoSemanal[] }) {
  const [aberto, setAberto] = useState(false);
  const concluidos = passos.filter((p) => p.feito).length;
  const tudoFeito = concluidos === passos.length;

  return (
    <Card className="mb-6">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-semibold text-navy">
            Método dos 30 minutos {tudoFeito && <span className="text-green-600">· tudo em dia</span>}
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Uma vez por semana, meia hora olhando o dinheiro com clareza.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] font-semibold text-gray-400">
            {concluidos}/{passos.length}
          </span>
          <span className="text-gray-400 text-xs">{aberto ? "▲" : "▼"}</span>
        </div>
      </button>

      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${(concluidos / passos.length) * 100}%`,
            background: tudoFeito ? "#00A878" : "#00B8A0",
          }}
        />
      </div>

      {aberto && (
        <div className="mt-4 space-y-2">
          {passos.map((p) => (
            <div key={p.numero} className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${
                  p.feito ? "text-white" : "bg-gray-100 text-gray-400"
                }`}
                style={p.feito ? { background: "#00A878" } : undefined}
              >
                {p.feito ? "✓" : p.numero}
              </div>
              <div className="min-w-0">
                <div className={`text-xs font-semibold ${p.feito ? "text-gray-500" : "text-navy"}`}>{p.titulo}</div>
                <div className="text-[11px] text-gray-400">{p.detalhe}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
