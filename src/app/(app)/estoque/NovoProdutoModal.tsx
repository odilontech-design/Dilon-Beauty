"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { createProduct } from "@/app/actions/estoque";

export function NovoProdutoModal() {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErro("");
          setOpen(true);
        }}
        className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2.5 whitespace-nowrap"
      >
        + Novo produto
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo produto">
        <form
          action={async (formData) => {
            setSaving(true);
            setErro("");
            try {
              await createProduct(formData);
              setOpen(false);
            } catch (e) {
              setErro(e instanceof Error ? e.message : "Não foi possível cadastrar.");
            } finally {
              setSaving(false);
            }
          }}
          className="space-y-3"
        >
          <Campo label="Nome do produto">
            <input name="name" required autoFocus className="input" placeholder="Ex: Shampoo hidratante 1L" />
          </Campo>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Unidade">
              <select name="unit" className="input" defaultValue="un">
                <option value="un">Unidade</option>
                <option value="ml">Mililitro (ml)</option>
                <option value="L">Litro (L)</option>
                <option value="g">Grama (g)</option>
                <option value="kg">Quilo (kg)</option>
                <option value="cx">Caixa</option>
              </select>
            </Campo>
            <Campo label="Quantidade que tem hoje">
              <input name="quantity" inputMode="decimal" defaultValue="0" className="input" />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Campo label="Avisar quando chegar em">
              <input name="minQuantity" inputMode="decimal" defaultValue="0" className="input" placeholder="0" />
            </Campo>
            <Campo label="Custo unitário (R$)">
              <input name="costPrice" inputMode="decimal" className="input" placeholder="0,00" />
            </Campo>
          </div>

          {erro && <p className="text-xs text-red-500">{erro}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Cadastrar produto"}
          </button>
          <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
        </form>
      </Modal>
    </>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
