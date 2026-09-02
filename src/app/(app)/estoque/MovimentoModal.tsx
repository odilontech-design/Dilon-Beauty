"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { registrarMovimento, type MovimentoState } from "@/app/actions/estoque";

const initial: MovimentoState = { ok: false };

type Produto = { id: string; name: string; unit: string; quantity: number; costPrice: number };

export function MovimentoModal({ produto }: { produto: Produto }) {
  const [open, setOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setResetKey((k) => k + 1);
          setOpen(true);
        }}
        className="text-[11px] font-semibold hover:underline whitespace-nowrap"
        style={{ color: "#00B8A0" }}
      >
        Movimentar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={produto.name}>
        <MovimentoForm key={resetKey} produto={produto} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function MovimentoForm({ produto, onDone }: { produto: Produto; onDone: () => void }) {
  const action = registrarMovimento.bind(null, produto.id);
  const [state, formAction] = useFormState(action, initial);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("SAIDA");

  useEffect(() => {
    if (state.ok) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="bg-gray-50 rounded-lg px-3 py-2 text-[11px] text-gray-500">
        Saldo atual:{" "}
        <strong className="text-navy">
          {produto.quantity} {produto.unit}
        </strong>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">O que aconteceu?</label>
        <div className="grid grid-cols-3 gap-2">
          <Opcao ativo={tipo === "SAIDA"} onClick={() => setTipo("SAIDA")} titulo="Usei" sub="baixa" cor="#C0526E" />
          <Opcao ativo={tipo === "ENTRADA"} onClick={() => setTipo("ENTRADA")} titulo="Comprei" sub="entrada" cor="#00A878" />
          <Opcao ativo={tipo === "AJUSTE"} onClick={() => setTipo("AJUSTE")} titulo="Contei" sub="ajuste" cor="#E0930A" />
        </div>
        <input type="hidden" name="type" value={tipo} />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
          {tipo === "AJUSTE" ? `Quantidade contada na prateleira (${produto.unit})` : `Quantidade (${produto.unit})`}
        </label>
        <input name="quantity" required inputMode="decimal" autoFocus className="input" placeholder="0" />
        {tipo === "AJUSTE" && (
          <p className="text-[10px] text-gray-400 mt-1">
            O saldo passa a ser exatamente esse número, não soma nem subtrai.
          </p>
        )}
      </div>

      {tipo === "ENTRADA" && (
        <>
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 mb-1">Custo por {produto.unit} (R$)</label>
            <input
              name="unitCost"
              inputMode="decimal"
              defaultValue={produto.costPrice ? String(produto.costPrice).replace(".", ",") : ""}
              className="input"
              placeholder="0,00"
            />
          </div>
          <label className="flex items-start gap-2 text-[11px] text-gray-600">
            <input type="checkbox" name="lancarNoFinanceiro" defaultChecked className="mt-0.5 w-4 h-4" />
            <span>Lançar essa compra como saída no Financeiro (Fornecedores e Produtos)</span>
          </label>
        </>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-gray-500 mb-1">Observação</label>
        <input name="notes" className="input" placeholder="Opcional" />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <BotaoSalvar />
      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </form>
  );
}

function BotaoSalvar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60"
    >
      {pending ? "Registrando..." : "Registrar"}
    </button>
  );
}

function Opcao({
  ativo,
  onClick,
  titulo,
  sub,
  cor,
}: {
  ativo: boolean;
  onClick: () => void;
  titulo: string;
  sub: string;
  cor: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-2 py-2 text-center transition-colors ${
        ativo ? "border-transparent" : "border-gray-200 hover:bg-gray-50"
      }`}
      style={ativo ? { background: `${cor}18`, borderColor: cor } : undefined}
    >
      <div className="text-xs font-semibold" style={{ color: ativo ? cor : "#03254C" }}>
        {titulo}
      </div>
      <div className="text-[10px] text-gray-400">{sub}</div>
    </button>
  );
}
