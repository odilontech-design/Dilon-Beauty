"use client";

import { useState } from "react";
import { updateTransaction, deleteTransaction } from "@/app/actions/financeiro";
import { competenciaFromDate, formatCompetenciaCurta } from "@/lib/finance/competencia";

type Category = { id: string; name: string; flow: "ENTRADA" | "SAIDA"; owner: "PF" | "PJ" | null };

type Transaction = {
  id: string;
  date: string;
  competencia: string;
  description: string;
  amount: number;
  flow: "ENTRADA" | "SAIDA";
  owner: "PF" | "PJ";
  status: "PAGO" | "PENDENTE";
  dueDate: string | null;
  categoryId: string | null;
  categoryName: string | null;
  source: "MANUAL" | "IMPORTACAO";
  origem: string | null; // rótulo do extrato de origem, quando veio de importação
};

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function TransactionRow({ transaction, categories }: { transaction: Transaction; categories: Category[] }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const categoriesForRow = categories.filter(
    (c) => c.flow === transaction.flow && (c.owner === transaction.owner || c.owner === null)
  );

  // Competência diferente do mês do pagamento é justamente o caso que o dono
  // precisa enxergar de longe — por isso ganha destaque em vez de virar só mais
  // um texto cinza igual aos outros.
  const competenciaAjustada = transaction.competencia !== competenciaFromDate(transaction.date);

  if (editing) {
    return (
      <tr className="border-b border-gray-50 bg-gray-50">
        <td colSpan={7} className="py-2.5 px-2">
          <form
            action={async (formData) => {
              setSaving(true);
              await updateTransaction(transaction.id, formData);
              setSaving(false);
              setEditing(false);
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="flex-1 min-w-[160px]">
              <span className="block text-[10px] text-gray-400 mb-1">Descrição</span>
              <input name="description" defaultValue={transaction.description} required className="input w-full" />
            </label>
            <label>
              <span className="block text-[10px] text-gray-400 mb-1">Conta</span>
              <select name="owner" defaultValue={transaction.owner} className="input w-20">
                <option value="PJ">PJ</option>
                <option value="PF">PF</option>
              </select>
            </label>
            <label>
              <span className="block text-[10px] text-gray-400 mb-1">Competência</span>
              <input type="month" name="competencia" defaultValue={transaction.competencia} className="input w-36" />
            </label>
            <label className="min-w-[160px]">
              <span className="block text-[10px] text-gray-400 mb-1">Categoria</span>
              <select name="categoryId" defaultValue={transaction.categoryId ?? ""} className="input w-full">
                <option value="">Sem categoria</option>
                {categoriesForRow.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={saving} className="text-[10px] font-semibold text-white bg-navy rounded-lg px-3 py-2 disabled:opacity-60">
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-[10px] font-semibold text-gray-500 hover:underline pb-2">
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
      <td className="whitespace-nowrap">
        <span
          className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
            competenciaAjustada ? "bg-amber-100 text-amber-700" : "text-gray-400"
          }`}
          title={competenciaAjustada ? "Competência diferente do mês do pagamento" : "Competência"}
        >
          {formatCompetenciaCurta(transaction.competencia)}
        </span>
      </td>
      <td className="max-w-[220px]">
        <div className="flex items-center gap-1.5">
          <span className="truncate" title={transaction.description}>{transaction.description}</span>
          {transaction.status === "PENDENTE" && (
            <span
              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 shrink-0"
              title={
                transaction.dueDate
                  ? `Vence em ${formatDate(transaction.dueDate)}`
                  : "Ainda não passou pelo banco"
              }
            >
              a pagar
            </span>
          )}
        </div>
        {transaction.origem && (
          <div className="text-[10px] text-gray-400 truncate" title={`Importado de ${transaction.origem}`}>
            {transaction.origem}
          </div>
        )}
      </td>
      <td>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${transaction.owner === "PJ" ? "bg-teal-100 text-teal-700" : "bg-purple-100 text-purple-700"}`}>
          {transaction.owner}
        </span>
      </td>
      <td className="text-gray-500">
        {transaction.categoryName ?? <span className="text-amber-600">Sem categoria</span>}
      </td>
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
