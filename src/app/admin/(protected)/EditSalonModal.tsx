"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import {
  adminUpdateSalon,
  adminResetPassword,
  type UpdateSalonState,
  type ResetPasswordState,
} from "@/app/actions/admin";

type Salon = {
  id: string;
  name: string;
  plan: string;
  active: boolean;
  trialEndsAt: string | null; // ISO yyyy-mm-dd ou ""
};

const updateInitial: UpdateSalonState = { ok: false };
const resetInitial: ResetPasswordState = { ok: false };

export function EditSalonModal({ salon }: { salon: Salon }) {
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
        className="text-[11px] font-semibold hover:underline"
        style={{ color: "#00B8A0" }}
      >
        Editar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={salon.name}>
        <EditSalonForm key={resetKey} salon={salon} />
      </Modal>
    </>
  );
}

function EditSalonForm({ salon }: { salon: Salon }) {
  const updateAction = adminUpdateSalon.bind(null, salon.id);
  const [updateState, updateFormAction] = useFormState(updateAction, updateInitial);

  const resetAction = adminResetPassword.bind(null, salon.id);
  const [resetState, resetFormAction] = useFormState(resetAction, resetInitial);

  return (
    <div className="space-y-5">
      <form action={updateFormAction} className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Plano</label>
          <select name="plan" defaultValue={salon.plan} className="input">
            <option value="STARTER">Starter — R$ 147/mês</option>
            <option value="PROFISSIONAL">Profissional — R$ 297/mês</option>
            <option value="CLINIC">Clinic — R$ 597/mês</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-gray-500 mb-1">
            Trial vai até (em branco = sem trial / já pagante)
          </label>
          <input type="date" name="trialEndsAt" defaultValue={salon.trialEndsAt ?? ""} className="input" />
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" name="active" defaultChecked={salon.active} className="w-4 h-4" />
          Conta ativa (desmarque pra bloquear login e o link público de agendamento)
        </label>

        {updateState.error && <p className="text-xs text-red-500">{updateState.error}</p>}
        {updateState.ok && <p className="text-xs" style={{ color: "#00B8A0" }}>Salvo!</p>}

        <SaveButton />
      </form>

      <div className="border-t border-gray-100 pt-4">
        {resetState.ok && resetState.password ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1">
            <div className="font-semibold text-navy">Nova senha temporária:</div>
            <div className="font-mono">{resetState.password}</div>
            <p className="text-[10px] text-gray-500 mt-1">Copie agora — não aparece de novo. Envie pra dona do salão.</p>
          </div>
        ) : (
          <form action={resetFormAction}>
            <ResetButton />
          </form>
        )}
      </div>

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Salvar alterações"}
    </button>
  );
}

function ResetButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full text-xs font-semibold rounded-lg py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-60"
    >
      {pending ? "Gerando..." : "Resetar senha da dona do salão"}
    </button>
  );
}
