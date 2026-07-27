"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createPublicAppointment, type PublicBookingState } from "./actions";

type Professional = { id: string; name: string; role: string | null };
type Service = { id: string; name: string; price: number };

const initialState: PublicBookingState = { ok: false };

export function BookingForm({
  slug,
  professionals,
  services,
  whatsapp,
}: {
  slug: string;
  professionals: Professional[];
  services: Service[];
  whatsapp: string | null;
}) {
  const action = createPublicAppointment.bind(null, slug);
  const [state, formAction] = useFormState(action, initialState);

  if (state.ok) {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-semibold text-navy">Agendamento solicitado!</p>
        <p className="text-xs text-gray-500 mt-1">
          O salão vai confirmar seu horário em breve.
          {whatsapp ? " Qualquer dúvida, chame no WhatsApp do salão." : ""}
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Seu nome">
        <input name="name" required className="input" placeholder="Nome completo" />
      </Field>
      <Field label="WhatsApp">
        <input name="phone" required className="input" placeholder="(21) 90000-0000" />
      </Field>
      <Field label="Profissional">
        <select name="professionalId" required defaultValue="" className="input">
          <option value="" disabled>Selecione</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
              {p.role ? ` — ${p.role}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Serviço">
        <select name="serviceId" required defaultValue="" className="input">
          <option value="" disabled>Selecione</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — R$ {s.price.toFixed(2)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Data">
          <input type="date" name="date" required className="input" />
        </Field>
        <Field label="Hora">
          <input type="time" name="time" required className="input" />
        </Field>
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <SubmitButton />

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:13px; }`}</style>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white text-sm font-semibold rounded-lg py-3 mt-2 disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Confirmar agendamento"}
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
