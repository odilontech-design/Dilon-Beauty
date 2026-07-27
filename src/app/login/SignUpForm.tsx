"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signUp, type SignUpState } from "@/app/actions/signup";

const initialState: SignUpState = { ok: false };

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction] = useFormState(signUp, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!state.ok) return;
    (async () => {
      setSigningIn(true);
      await signIn("credentials", { email, password, redirect: false });
      router.push("/dashboard");
      router.refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Nome do salão</label>
        <input
          name="salonName"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="Salão da Carla"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Seu nome</label>
        <input
          name="ownerName"
          required
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="Carla Souza"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="voce@seusalao.com.br"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">WhatsApp (opcional)</label>
        <input
          name="whatsapp"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="21 90000-0000"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="Mínimo 6 caracteres"
        />
      </div>

      {state.error && <p className="text-xs text-red-500">{state.error}</p>}

      <SubmitButton signingIn={signingIn} />
    </form>
  );
}

function SubmitButton({ signingIn }: { signingIn: boolean }) {
  const { pending } = useFormStatus();
  const busy = pending || signingIn;
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full bg-navy text-white font-semibold text-sm rounded-lg py-3 disabled:opacity-60"
    >
      {busy ? "Criando conta..." : "Criar conta grátis"}
    </button>
  );
}
