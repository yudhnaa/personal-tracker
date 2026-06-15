"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";

export function AuthPage({
  mode,
  initialLocale,
}: {
  mode: "login" | "register";
  initialLocale: Locale;
}) {
  const router = useRouter();
  const t = messages[initialLocale].auth;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch(`/api/auth/${isRegister ? "sign-up" : "sign-in"}/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(isRegister ? { name, email, password } : { email, password }),
    });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell locale={initialLocale}>
      <form onSubmit={submit} className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6">
        <h1 className="text-2xl font-semibold">{isRegister ? t.registerTitle : t.loginTitle}</h1>
        <div className="mt-6 space-y-4">
          {isRegister ? (
            <label className="block text-sm font-semibold">
              {t.name}
              <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}
          <label className="block text-sm font-semibold">
            {t.email}
            <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            {t.password}
            <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          </label>
        </div>
        {error ? <p className="mt-4 rounded-[var(--radius-inner)] bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        <button className="mt-6 w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink">
          {isRegister ? t.submitRegister : t.submitLogin}
        </button>
        <div className="mt-4 flex justify-between text-sm text-ink-soft">
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? t.submitLogin : t.submitRegister}</Link>
          {!isRegister ? <Link href="/forgot-password">{t.forgot}</Link> : null}
        </div>
      </form>
    </AuthShell>
  );
}
