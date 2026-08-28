"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { previewStatement, confirmImport, type PreviewRow } from "@/app/actions/financeiro";

type Category = { id: string; name: string; flow: "ENTRADA" | "SAIDA"; owner: "PF" | "PJ" | null };

type EditableRow = PreviewRow & { include: boolean; categoryId: string | null };

const currency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC" });

export function ImportClient({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [owner, setOwner] = useState<"PJ" | "PF">("PJ");
  const [bankLabel, setBankLabel] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<EditableRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const categoriesForOwner = useMemo(
    () => categories.filter((c) => c.owner === owner || c.owner === null),
    [categories, owner]
  );

  async function handleAnalyze(formData: FormData) {
    setError(null);
    setDone(null);
    setLoading(true);
    formData.set("owner", owner);
    const file = formData.get("file") as File | null;
    setFileName(file?.name ?? "");

    const result = await previewStatement(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      setRows(null);
      return;
    }

    setRows(
      result.rows.map((r) => ({
        ...r,
        include: !r.isDuplicate,
        categoryId: r.suggestedCategoryId,
      }))
    );
  }

  function updateRow(externalId: string, patch: Partial<EditableRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.externalId === externalId ? { ...r, ...patch } : r)) : prev));
  }

  async function handleConfirm() {
    if (!rows) return;
    const selected = rows.filter((r) => r.include);
    if (selected.length === 0) {
      setError("Selecione ao menos um lançamento pra importar.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const result = await confirmImport({
        owner,
        bankLabel,
        fileName,
        rows: selected.map((r) => ({
          date: r.date,
          description: r.description,
          amount: r.amount,
          flow: r.flow,
          externalId: r.externalId,
          categoryId: r.categoryId,
        })),
      });
      setDone(result.importedCount);
      setRows(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar a importação.");
    } finally {
      setSaving(false);
    }
  }

  if (done !== null) {
    return (
      <Card>
        <div className="text-sm font-semibold text-navy mb-2">Importação concluída!</div>
        <p className="text-xs text-gray-500 mb-4">
          {done} lançamento{done === 1 ? "" : "s"} adicionado{done === 1 ? "" : "s"} ao financeiro.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/financeiro")}
            className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2"
          >
            Ver financeiro
          </button>
          <button
            type="button"
            onClick={() => setDone(null)}
            className="text-xs font-semibold text-gray-500 hover:underline"
          >
            Importar outro extrato
          </button>
        </div>
      </Card>
    );
  }

  if (rows) {
    const totalEntradas = rows.filter((r) => r.include && r.flow === "ENTRADA").reduce((s, r) => s + r.amount, 0);
    const totalSaidas = rows.filter((r) => r.include && r.flow === "SAIDA").reduce((s, r) => s + r.amount, 0);
    const duplicateCount = rows.filter((r) => r.isDuplicate).length;

    return (
      <Card>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <div className="text-sm font-semibold text-navy">Revise antes de importar</div>
            <div className="text-[11px] text-gray-500 mt-0.5">
              Conta {owner === "PJ" ? "Pessoa Jurídica (CNPJ)" : "Pessoa Física (CPF)"} · {rows.length} lançamentos encontrados
              {duplicateCount > 0 && ` · ${duplicateCount} já importado(s) antes (desmarcados)`}
            </div>
          </div>
          <div className="flex gap-3 text-[11px]">
            <span className="text-green-600 font-semibold">+ {currency(totalEntradas)}</span>
            <span className="text-red-500 font-semibold">- {currency(totalSaidas)}</span>
          </div>
        </div>

        {error && <div className="text-[11px] text-red-600 mb-3">{error}</div>}

        <div className="overflow-x-auto max-h-[420px] overflow-y-auto border border-gray-100 rounded-xl">
          <table className="w-full text-xs min-w-[640px]">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-400 border-b border-gray-100">
                <th className="py-2 pl-3 font-semibold"></th>
                <th className="font-semibold">Data</th>
                <th className="font-semibold">Descrição</th>
                <th className="font-semibold">Valor</th>
                <th className="font-semibold">Categoria</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.externalId} className={`border-b border-gray-50 ${r.isDuplicate ? "opacity-50" : ""}`}>
                  <td className="py-2 pl-3">
                    <input
                      type="checkbox"
                      checked={r.include}
                      onChange={(e) => updateRow(r.externalId, { include: e.target.checked })}
                    />
                  </td>
                  <td className="whitespace-nowrap text-gray-500">{formatDate(r.date)}</td>
                  <td className="max-w-[220px] truncate" title={r.description}>{r.description}</td>
                  <td className={`whitespace-nowrap font-semibold ${r.flow === "ENTRADA" ? "text-green-600" : "text-red-500"}`}>
                    {r.flow === "ENTRADA" ? "+" : "-"} {currency(r.amount)}
                  </td>
                  <td>
                    <select
                      className="input"
                      value={r.categoryId ?? ""}
                      onChange={(e) => updateRow(r.externalId, { categoryId: e.target.value || null })}
                    >
                      <option value="">Sem categoria</option>
                      {categoriesForOwner
                        .filter((c) => c.flow === r.flow)
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3 mt-4">
          <button
            type="button"
            disabled={saving}
            onClick={handleConfirm}
            className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2.5 disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Confirmar importação"}
          </button>
          <button
            type="button"
            onClick={() => setRows(null)}
            className="text-xs font-semibold text-gray-500 hover:underline"
          >
            Cancelar
          </button>
        </div>

        <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; font-size:11px; }`}</style>
      </Card>
    );
  }

  return (
    <Card>
      <form action={handleAnalyze} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1.5">Essa conta é...</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOwner("PJ")}
              className={`flex-1 text-xs font-semibold rounded-lg py-3 border ${owner === "PJ" ? "bg-navy text-white border-navy" : "border-gray-200 text-gray-500"}`}
            >
              Pessoa Jurídica (CNPJ)
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Conta da empresa</div>
            </button>
            <button
              type="button"
              onClick={() => setOwner("PF")}
              className={`flex-1 text-xs font-semibold rounded-lg py-3 border ${owner === "PF" ? "bg-navy text-white border-navy" : "border-gray-200 text-gray-500"}`}
            >
              Pessoa Física (CPF)
              <div className="text-[10px] font-normal opacity-80 mt-0.5">Conta pessoal do dono</div>
            </button>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Apelido do banco/conta (opcional)</label>
          <input
            className="input"
            placeholder="Ex: Nubank PJ"
            value={bankLabel}
            onChange={(e) => setBankLabel(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Arquivo do extrato (.csv, .ofx ou .pdf)</label>
          <input type="file" name="file" accept=".csv,.ofx,.qfx,.txt,.pdf" required className="input" />
        </div>

        {error && <div className="text-[11px] text-red-600">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="text-xs font-semibold text-white bg-navy rounded-lg px-4 py-2.5 disabled:opacity-60"
        >
          {loading ? "Analisando..." : "Analisar extrato"}
        </button>
      </form>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </Card>
  );
}
