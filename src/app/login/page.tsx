"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { SignUpForm } from "./SignUpForm";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("E-mail ou senha incorretos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">E-mail</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="voce@seusalao.com.br"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Senha</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-navy"
          placeholder="••••••••"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-navy text-white font-semibold text-sm rounded-lg py-3 disabled:opacity-60"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <div className="min-h-screen flex items-center justify-center bg-navyDeep px-4 py-10">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="font-display font-extrabold text-xl text-navy">
            Dilon <span className="text-teal-500" style={{ color: "#00B8A0" }}>Beauty</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {mode === "login" ? "Entre com sua conta do salão" : "Crie a conta do seu salão em 1 minuto"}
          </p>
        </div>

        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 text-xs font-semibold rounded-md py-2 transition-colors ${
              mode === "login" ? "bg-white text-navy shadow-sm" : "text-gray-500"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 text-xs font-semibold rounded-md py-2 transition-colors ${
              mode === "signup" ? "bg-white text-navy shadow-sm" : "text-gray-500"
            }`}
          >
            Criar conta
          </button>
        </div>

        {mode === "login" ? <LoginForm /> : <SignUpForm />}
      </div>
    </div>
  );
}
