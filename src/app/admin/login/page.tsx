"use client";

import { useFormState, useFormStatus } from "react-dom";
import { adminLogin, type AdminLoginState } from "@/app/actions/admin";

const initialState: AdminLoginState = { ok: false };

export default function AdminLoginPage() {
  const [state, formAction] = useFormState(adminLogin, initialState);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navyDeep px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="font-display font-extrabold text-xl text-navy">
            Dilon <span style={{ color: "#00B8A0" }}>Beauty</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">Painel administrativo</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Senha de admin</label>
            <input
              type="password"
              name="password"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
              placeholder="••••••••"
            />
          </div>

          {state.error && <p className="text-xs text-red-500">{state.error}</p>}

          <SubmitButton />
        </form>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-navy text-white font-semibold text-sm rounded-lg py-3 disabled:opacity-60"
    >
      {pending ? "Entrando..." : "Entrar"}
    </button>
  );
}
