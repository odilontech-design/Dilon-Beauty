"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { createAppointment } from "@/app/actions/agenda";

type Option = { id: string; label: string };

export function NewAppointmentModal({
  clients,
  professionals,
  services,
  defaultDate,
}: {
  clients: Option[];
  professionals: Option[];
  services: Option[];
  defaultDate: string;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const canSubmit = clients.length > 0 && professionals.length > 0 && services.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="bg-navy text-white text-xs font-semibold rounded-lg py-2.5 px-4 whitespace-nowrap"
      >
        + Novo agendamento
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo agendamento">
        {canSubmit ? (
          <form
            action={async (formData) => {
              setSaving(true);
              await createAppointment(formData);
              setSaving(false);
              setOpen(false);
            }}
            className="space-y-3"
          >
            <Field label="Cliente">
              <select name="clientId" required className="input">
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Profissional">
              <select name="professionalId" required className="input">
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Serviço">
              <select name="serviceId" required className="input">
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Data">
                <input type="date" name="date" required defaultValue={defaultDate} className="input" />
              </Field>
              <Field label="Hora">
                <input type="time" name="time" required className="input" />
              </Field>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 mt-2 disabled:opacity-60"
            >
              {saving ? "Agendando..." : "Agendar"}
            </button>
          </form>
        ) : (
          <p className="text-xs text-gray-500">
            Cadastre ao menos 1 cliente, profissional e serviço antes de criar um agendamento.
          </p>
        )}
        <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
      </Modal>
    </>
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
