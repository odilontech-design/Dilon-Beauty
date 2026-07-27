"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createPublicAppointment, fetchAvailableTimes, type PublicBookingState } from "./actions";

type Professional = { id: string; name: string; role: string | null };
type Service = { id: string; name: string; price: number; durationMin: number };

const initialState: PublicBookingState = { ok: false };

export function BookingForm({
  slug,
  salonName,
  professionals,
  services,
  whatsapp,
}: {
  slug: string;
  salonName: string;
  professionals: Professional[];
  services: Service[];
  whatsapp: string | null;
}) {
  const [name, setName] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);

  const action = createPublicAppointment.bind(null, slug);
  const [state, formAction] = useFormState(action, initialState);

  // Recalcula os horários livres sempre que profissional, serviço ou data
  // mudam — a lista já vem sem os horários ocupados e sem os que não cabem
  // (duração do serviço) dentro do funcionamento do salão.
  useEffect(() => {
    setTime("");
    if (!professionalId || !serviceId || !date) {
      setAvailableTimes([]);
      return;
    }
    let cancelled = false;
    setLoadingTimes(true);
    fetchAvailableTimes(slug, professionalId, serviceId, date).then((times) => {
      if (cancelled) return;
      setAvailableTimes(times);
      setLoadingTimes(false);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, professionalId, serviceId, date]);

  // Ao confirmar, manda a cliente pro WhatsApp do salão com o resumo já
  // escrito — é ela quem envia a mensagem confirmando o agendamento.
  useEffect(() => {
    if (!state.ok || !whatsapp) return;

    const professional = professionals.find((p) => p.id === professionalId);
    const service = services.find((s) => s.id === serviceId);
    const [year, month, day] = date.split("-");

    const lines = [
      `Olá! Gostaria de confirmar meu agendamento em *${salonName}*:`,
      "",
      professional ? `💇 Profissional: ${professional.name}` : null,
      service ? `✂️ Serviço: ${service.name} (${service.durationMin} min)` : null,
      day ? `📅 Data: ${day}/${month}/${year}` : null,
      `🕐 Horário: ${time}`,
      service ? `💰 Valor: R$ ${service.price.toFixed(2)}` : null,
      "",
      `Cliente: ${name}`,
    ]
      .filter(Boolean)
      .join("\n");

    const digits = whatsapp.replace(/\D/g, "");
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(lines)}`;

    const timeout = setTimeout(() => {
      window.location.href = waUrl;
    }, 800);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  if (state.ok) {
    const professional = professionals.find((p) => p.id === professionalId);
    const service = services.find((s) => s.id === serviceId);
    const [year, month, day] = date.split("-");
    const digits = (whatsapp ?? "").replace(/\D/g, "");
    const waText = [
      `Olá! Gostaria de confirmar meu agendamento em *${salonName}*:`,
      "",
      professional ? `💇 Profissional: ${professional.name}` : null,
      service ? `✂️ Serviço: ${service.name} (${service.durationMin} min)` : null,
      day ? `📅 Data: ${day}/${month}/${year}` : null,
      `🕐 Horário: ${time}`,
      service ? `💰 Valor: R$ ${service.price.toFixed(2)}` : null,
      "",
      `Cliente: ${name}`,
    ]
      .filter(Boolean)
      .join("\n");
    const waUrl = `https://wa.me/${digits}?text=${encodeURIComponent(waText)}`;

    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">✅</div>
        <p className="text-sm font-semibold text-navy">Agendamento solicitado!</p>
        {whatsapp ? (
          <>
            <p className="text-xs text-gray-500 mt-1">Te levando pro WhatsApp pra confirmar com o salão...</p>
            <a
              href={waUrl}
              className="inline-block mt-4 bg-navy text-white text-xs font-semibold rounded-lg py-2.5 px-4"
            >
              Abrir WhatsApp agora
            </a>
          </>
        ) : (
          <p className="text-xs text-gray-500 mt-1">O salão vai confirmar seu horário em breve.</p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Seu nome">
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Nome completo"
        />
      </Field>
      <Field label="WhatsApp">
        <input name="phone" required className="input" placeholder="(21) 90000-0000" />
      </Field>
      <Field label="Profissional">
        <select
          name="professionalId"
          required
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          className="input"
        >
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
        <select
          name="serviceId"
          required
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className="input"
        >
          <option value="" disabled>Selecione</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — R$ {s.price.toFixed(2)} ({s.durationMin} min)
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Data">
          <input
            type="date"
            name="date"
            required
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Horário">
          <select
            name="time"
            required
            value={time}
            onChange={(e) => setTime(e.target.value)}
            disabled={!professionalId || !serviceId || !date || loadingTimes}
            className="input"
          >
            <option value="" disabled>
              {loadingTimes
                ? "Buscando..."
                : !professionalId || !serviceId || !date
                ? "Escolha antes"
                : availableTimes.length === 0
                ? "Sem vagas nesse dia"
                : "Selecione"}
            </option>
            {availableTimes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {professionalId && serviceId && date && !loadingTimes && availableTimes.length === 0 && (
        <p className="text-xs" style={{ color: "#C0526E" }}>
          Não há horários livres nesse dia para esse profissional/serviço. Tente outra data.
        </p>
      )}

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <SubmitButton disabled={!time} />

      <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:13px; }`}</style>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
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
