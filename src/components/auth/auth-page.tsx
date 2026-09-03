"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";
import { authenticate, type EmailVerificationPending } from "@/lib/auth-client";
import { apiJson } from "@/lib/api-client";
import { useCurrentAccount } from "@/lib/use-required-account";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CURRENT_ACCOUNT_QUERY_KEY } from "@/lib/use-required-account";

export function AuthPage({
  mode,
  initialLocale,
}: {
  mode: "login" | "register";
  initialLocale: Locale;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = messages[initialLocale].auth;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [verificationPending, setVerificationPending] = useState<EmailVerificationPending | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRegister = mode === "register";
  const account = useCurrentAccount();

  useEffect(() => {
    if (account.data) router.replace("/dashboard");
  }, [account.data, router]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const authenticatedAccount = await authenticate(isRegister ? "register" : "login", {
        email,
        password,
        displayName: isRegister ? name : undefined,
      });
      if ("status" in authenticatedAccount) {
        setVerificationPending(authenticatedAccount);
        return;
      }
      queryClient.clear();
      queryClient.setQueryData(CURRENT_ACCOUNT_QUERY_KEY, authenticatedAccount);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function resendVerification() {
    if (!verificationPending || submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await apiJson<void>(
        "/api/v1/auth/email-verification/resend",
        { method: "POST", body: JSON.stringify({ email: verificationPending.email }) },
      );
      setError(t.verificationResent);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell locale={initialLocale}>
      <form onSubmit={submit} className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6">
        <h1 className="text-2xl font-semibold">
          {verificationPending ? t.verifyEmailTitle : isRegister ? t.registerTitle : t.loginTitle}
        </h1>
        {verificationPending ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">{t.verificationEmailSent}</p>
            <button type="button" onClick={resendVerification} disabled={submitting} className="w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink disabled:cursor-not-allowed disabled:opacity-60">
              {t.resendVerification}
            </button>
          </div>
        ) : <>
        <div className="mt-6 space-y-4">
          {isRegister ? (
            <label className="block text-sm font-semibold">
              {t.name}
              <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
          ) : null}
          <label className="block text-sm font-semibold">
            {t.email}
            <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" type="email" name="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="block text-sm font-semibold">
            {t.password}
            <input className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent" type="password" name="password" autoComplete={isRegister ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isRegister ? 12 : 1} />
          </label>
        </div>
        <button type="submit" disabled={submitting} className="mt-6 w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink disabled:cursor-not-allowed disabled:opacity-60">
          {isRegister ? t.submitRegister : t.submitLogin}
        </button>
        <div className="mt-4 flex justify-between text-sm text-ink-soft">
          <Link href={isRegister ? "/login" : "/register"}>{isRegister ? t.submitLogin : t.submitRegister}</Link>
          {!isRegister ? <Link href="/forgot-password">{t.forgot}</Link> : null}
        </div>
        </>}
        {error ? <p role="alert" className="mt-4 rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">{error}</p> : null}
      </form>
    </AuthShell>
  );
}
