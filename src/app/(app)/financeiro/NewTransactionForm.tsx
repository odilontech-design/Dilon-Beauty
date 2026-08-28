"use client";

import { useMemo, useState } from "react";
import { createTransaction } from "@/app/actions/financeiro";
import { todayDateStrInSalonTZ } from "@/lib/date";

type Category = { id: string; name: string; flow: "ENTRADA" | "SAIDA"; owner: "PF" | "PJ" | null };

export function NewTransactionForm({ categories }: { categories: Category[] }) {
  const [owner, setOwner] = useState<"PJ" | "PF">("PJ");
  const [flow, setFlow] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [saving, setSaving] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.flow === flow && (c.owner === owner || c.owner === null)),
    [categories, flow, owner]
  );

  return (
    <form
      action={async (formData) => {
        setSaving(true);
        try {
          await createTransaction(formData);
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <input name="description" required className="input" placeholder="Descrição" />

      <div className="grid grid-cols-2 gap-2">
        <input type="date" name="date" defaultValue={todayDateStrInSalonTZ()} required className="input" />
        <input name="amount" required inputMode="decimal" className="input" placeholder="Valor (R$)" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select name="flow" value={flow} onChange={(e) => setFlow(e.target.value as "ENTRADA" | "SAIDA")} className="input">
          <option value="SAIDA">Saída</option>
          <option value="ENTRADA">Entrada</option>
        </select>
        <select name="owner" value={owner} onChange={(e) => setOwner(e.target.value as "PJ" | "PF")} className="input">
          <option value="PJ">Pessoa Jurídica</option>
          <option value="PF">Pessoa Física</option>
        </select>
      </div>

      <select name="categoryId" className="input">
        <option value="">Sem categoria</option>
        {filteredCategories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input name="counterparty" className="input" placeholder="Cliente / Fornecedor (opcional)" />

      <button type="submit" disabled={saving} className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60">
        {saving ? "Salvando..." : "Lançar"}
      </button>
    </form>
  );
}
