"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { createTransaction } from "@/app/actions/financeiro";
import { todayDateStrInSalonTZ } from "@/lib/date";
import { competenciaFromDate, formatCompetencia } from "@/lib/finance/competencia";

type Category = { id: string; name: string; flow: "ENTRADA" | "SAIDA"; owner: "PF" | "PJ" | null };

export function NewTransactionModal({ categories }: { categories: Category[] }) {
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
        className="text-xs font-semibold text-navy border border-gray-200 bg-white rounded-lg px-4 py-2.5 whitespace-nowrap hover:bg-gray-50"
      >
        + Lançar manualmente
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo lançamento">
        <NewTransactionForm key={resetKey} categories={categories} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function NewTransactionForm({
  categories,
  onDone,
}: {
  categories: Category[];
  onDone: () => void;
}) {
  const hoje = todayDateStrInSalonTZ();
  const [owner, setOwner] = useState<"PJ" | "PF">("PJ");
  const [flow, setFlow] = useState<"ENTRADA" | "SAIDA">("SAIDA");
  const [date, setDate] = useState(hoje);
  // Competência acompanha a data enquanto o dono não mexer nela. Quando ele
  // mexe, para de acompanhar — senão trocar a data desfaria a correção dele.
  const [competencia, setCompetencia] = useState(competenciaFromDate(hoje));
  const [competenciaTravada, setCompetenciaTravada] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  const categoriasDoContexto = useMemo(
    () => categories.filter((c) => c.flow === flow && (c.owner === owner || c.owner === null)),
    [categories, flow, owner]
  );

  const competenciaDiferente = competencia !== competenciaFromDate(date);

  return (
    <form
      action={async (formData) => {
        setSaving(true);
        setErro("");
        try {
          await createTransaction(formData);
          onDone();
        } catch (e) {
          setErro(e instanceof Error ? e.message : "Não foi possível lançar.");
        } finally {
          setSaving(false);
        }
      }}
      className="space-y-3"
    >
      <Campo label="O que foi?">
        <input
          name="description"
          required
          autoFocus
          className="input"
          placeholder="Ex: Compra de shampoo, aluguel, conta de luz"
        />
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Tipo">
          <select
            name="flow"
            value={flow}
            onChange={(e) => setFlow(e.target.value as "ENTRADA" | "SAIDA")}
            className="input"
          >
            <option value="SAIDA">Saída (saiu dinheiro)</option>
            <option value="ENTRADA">Entrada (entrou dinheiro)</option>
          </select>
        </Campo>
        <Campo label="Valor (R$)">
          <input name="amount" required inputMode="decimal" className="input" placeholder="0,00" />
        </Campo>
      </div>

      <Campo label="Conta">
        <div className="grid grid-cols-2 gap-2">
          <BotaoConta
            ativo={owner === "PJ"}
            onClick={() => setOwner("PJ")}
            titulo="Empresa"
            sub="CNPJ"
            cor="#00B8A0"
          />
          <BotaoConta
            ativo={owner === "PF"}
            onClick={() => setOwner("PF")}
            titulo="Pessoal"
            sub="CPF"
            cor="#A855F7"
          />
        </div>
        <input type="hidden" name="owner" value={owner} />
      </Campo>

      <div className="grid grid-cols-2 gap-2">
        <Campo label="Data do pagamento">
          <input
            type="date"
            name="date"
            required
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (!competenciaTravada && e.target.value) {
                setCompetencia(competenciaFromDate(e.target.value));
              }
            }}
            className="input"
          />
        </Campo>
        <Campo label="Competência">
          <input
            type="month"
            name="competencia"
            required
            value={competencia}
            onChange={(e) => {
              setCompetencia(e.target.value);
              setCompetenciaTravada(true);
            }}
            className="input"
          />
        </Campo>
      </div>

      <p className="text-[10px] text-gray-400 -mt-1">
        {competenciaDiferente ? (
          <>
            Pago em {new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")}, mas contando no mês de{" "}
            <strong className="text-gray-500">{formatCompetencia(competencia)}</strong>.
          </>
        ) : (
          "Mude a competência se o gasto se refere a outro mês (ex: conta de setembro paga em outubro)."
        )}
      </p>

      <Campo label="Categoria">
        <select name="categoryId" className="input">
          <option value="">Sem categoria</option>
          {categoriasDoContexto.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Campo>

      <Campo label="Cliente / Fornecedor (opcional)">
        <input name="counterparty" className="input" placeholder="Ex: Distribuidora Beleza" />
      </Campo>

      {erro && <p className="text-xs text-red-500">{erro}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Lançar"}
      </button>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </form>
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

function BotaoConta({
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
      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
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
