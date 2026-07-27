"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { adminCreateSalon, type CreateSalonState } from "@/app/actions/admin";

const initialState: CreateSalonState = { ok: false };

export function NewSalonModal() {
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
        className="bg-navy text-white text-xs font-semibold rounded-lg py-2.5 px-4 whitespace-nowrap"
      >
        + Novo salão
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo salão">
        <NewSalonForm key={resetKey} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}

function NewSalonForm({ onClose }: { onClose: () => void }) {
  const [state, formAction] = useFormState(adminCreateSalon, initialState);

  if (state.ok) {
    return (
      <div className="text-sm space-y-3">
        <p className="text-navy font-semibold">✅ Conta criada!</p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs space-y-1.5 font-mono">
          <div><span className="text-gray-500 font-sans">Link público:</span> /agendar/{state.slug}</div>
          <div><span className="text-gray-500 font-sans">Senha temporária:</span> {state.password}</div>
        </div>
        <p className="text-[11px] text-gray-500">
          Copie a senha agora — ela não aparece de novo. Envie o e-mail e essa senha pra dona do salão.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 mt-1"
        >
          Fechar
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Nome do salão">
        <input name="salonName" required className="input" placeholder="Salão da Carla" />
      </Field>
      <Field label="Nome da dona/profissional">
        <input name="ownerName" required className="input" placeholder="Carla Souza" />
      </Field>
      <Field label="E-mail">
        <input type="email" name="email" required className="input" placeholder="carla@email.com" />
      </Field>
      <Field label="WhatsApp (opcional)">
        <input name="whatsapp" className="input" placeholder="5521900000000" />
      </Field>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <SubmitButton />
      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 mt-2 disabled:opacity-60"
    >
      {pending ? "Criando..." : "Criar salão"}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
