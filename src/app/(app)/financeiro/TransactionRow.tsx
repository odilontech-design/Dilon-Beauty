"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/actions/financeiro";

type Category = { id: string; name: string; flow: "ENTRADA" | "SAIDA"; owner: "PF" | "PJ" | null };

type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  flow: "ENTRADA" | "SAIDA";
  owner: "PF" | "PJ";
  categoryId: string | null;
  categoryName: string | null;
  source: "MANUAL" | "IMPORTACAO";
};

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function TransactionRow({ transaction, categories }: { transaction: Transaction; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoriesForRow = categories.filter(
    (c) => c.flow === transaction.flow && (c.owner === transaction.owner || c.owner === null)
  );

  if (editing) {
    return (
      <tr className="border-b border-gray-50 bg-gray-50">
        <td colSpan={6} className="py-2.5">
          <form
            action={async (formData) => {
              setSaving(true);
              await updateTransaction(transaction.id, formData);
              setSaving(false);
              setEditing(false);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input name="description" defaultValue={transaction.description} required className="input flex-1 min-w-[140px]" placeholder="Descrição" />
            <select name="owner" defaultValue={transaction.owner} className="input w-24">
              <option value="PJ">PJ</option>
              <option value="PF">PF</option>
            </select>
            <select name="categoryId" defaultValue={transaction.categoryId ?? ""} className="input min-w-[160px]">
              <option value="">Sem categoria</option>
              {categoriesForRow.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button type="submit" disabled={saving} className="text-[10px] font-semibold text-white bg-navy rounded-lg px-3 py-1.5 disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-[10px] font-semibold text-gray-500 hover:underline">
              Cancelar
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 whitespace-nowrap text-gray-500">{formatDate(transaction.date)}</td>
      <td className="max-w-[220px] truncate" title={transaction.description}>{transaction.description}</td>
      <td>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${transaction.owner === "PJ" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>
          {transaction.owner}
        </span>
      </td>
      <td className="text-gray-500">{transaction.categoryName ?? "—"}</td>
      <td className={`font-semibold whitespace-nowrap ${transaction.flow === "ENTRADA" ? "text-green-600" : "text-red-500"}`}>
        {transaction.flow === "ENTRADA" ? "+" : "-"} {currency(transaction.amount)}
      </td>
      <td>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setEditing(true)} className="text-[10px] font-semibold hover:underline" style={{ color: "#00B8A0" }}>
            Editar
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("Remover esse lançamento?")) deleteTransaction(transaction.id);
            }}
            className="text-[10px] font-semibold text-red-500 hover:underline"
          >
            Remover
          </button>
        </div>
      </td>
    </tr>
  );
}
