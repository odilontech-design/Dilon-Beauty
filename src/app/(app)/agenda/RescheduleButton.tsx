"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { rescheduleAppointment, type RescheduleState } from "@/app/actions/agenda";

const initialState: RescheduleState = { ok: false };

export function RescheduleButton({
  appointmentId,
  currentDate,
  currentTime,
}: {
  appointmentId: string;
  currentDate: string;
  currentTime: string;
}) {
  const [open, setOpen] = useState(false);
  const action = rescheduleAppointment.bind(null, appointmentId);
  const [state, formAction] = useFormState(action, initialState);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[10px] font-semibold hover:underline"
        style={{ color: "#3DA5FF" }}
      >
        Reagendar
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Reagendar">
        <form action={formAction} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Nova data</label>
              <input type="date" name="date" required defaultValue={currentDate} className="input" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 mb-1">Novo horário</label>
              <input type="time" name="time" required defaultValue={currentTime} className="input" />
            </div>
          </div>
          {state.error && <p className="text-xs text-red-500">{state.error}</p>}
          <SubmitButton />
        </form>
        <style>{`.input{ width:100%; border:1px solid #e5e7eb; border-radius:8px; padding:8px 10px; font-size:12px; }`}</style>
      </Modal>
    </>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white text-xs font-semibold rounded-lg py-2.5 disabled:opacity-60"
    >
      {pending ? "Salvando..." : "Confirmar novo horário"}
    </button>
  );
}
