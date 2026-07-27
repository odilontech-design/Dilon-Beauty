"use client";

import { useState } from "react";
import { updateClient } from "@/app/actions/clientes";
import { WhatsAppButton } from "@/components/WhatsAppButton";

type Client = {
  id: string;
  name: string;
  phone: string | null;
  notes: string | null;
  appointmentsCount: number;
};

export function ClientRow({ client, salonName }: { client: Client; salonName: string }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <tr className="border-b border-gray-50 bg-gray-50">
        <td colSpan={4} className="py-2.5">
          <form
            action={async (formData) => {
              setSaving(true);
              await updateClient(client.id, formData);
              setSaving(false);
              setEditing(false);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input name="name" defaultValue={client.name} required className="input flex-1 min-w-[110px]" placeholder="Nome" />
            <input name="phone" defaultValue={client.phone ?? ""} className="input flex-1 min-w-[110px]" placeholder="WhatsApp" />
            <input name="notes" defaultValue={client.notes ?? ""} className="input flex-1 min-w-[140px]" placeholder="Observações" />
            <button
              type="submit"
              disabled={saving}
              className="text-[10px] font-semibold text-white bg-navy rounded-lg px-3 py-1.5 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[10px] font-semibold text-gray-500 hover:underline"
            >
              Cancelar
            </button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-50">
      <td className="py-2.5 font-medium text-navy">{client.name}</td>
      <td className="text-gray-500">{client.phone || "—"}</td>
      <td>{client.appointmentsCount}</td>
      <td>
        <div className="flex items-center gap-3">
          <WhatsAppButton phone={client.phone} message={`Olá ${client.name}! Aqui é do ${salonName}.`} />
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[10px] font-semibold hover:underline"
            style={{ color: "#00B8A0" }}
          >
            Editar
          </button>
        </div>
      </td>
    </tr>
  );
}
