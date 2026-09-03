"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell } from "./auth-shell";
import { apiJson } from "@/lib/api-client";
import { messages, type Locale } from "@/lib/i18n";

export function VerifyEmailPage({ initialLocale, token }: { initialLocale: Locale; token: string }) {
  const t = messages[initialLocale].auth;
  const router = useRouter();
  const isMounted = useRef(false);
  const verificationStarted = useRef(false);
  const [message, setMessage] = useState(() => token ? "" : t.verifyEmailMissingToken);
  const [verifying, setVerifying] = useState(Boolean(token));

  useEffect(() => {
    isMounted.current = true;
    if (!token || verificationStarted.current) {
      return () => {
        isMounted.current = false;
      };
    }
    verificationStarted.current = true;
    void apiJson<void>("/api/v1/auth/email-verification/verify", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(() => {
        if (isMounted.current) router.replace("/login?verified=1");
      })
      .catch((error) => {
        if (isMounted.current) setMessage(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (isMounted.current) setVerifying(false);
      });
    return () => {
      isMounted.current = false;
    };
  }, [router, token]);

  return (
    <AuthShell locale={initialLocale}>
      <section className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6">
        <h1 className="text-2xl font-semibold">{t.verifyEmailTitle}</h1>
        {verifying ? <p className="mt-6 text-sm text-ink-soft">{t.verifyingEmail}</p> : null}
        {message ? <p aria-live="polite" className="mt-4 rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">{message}</p> : null}
      </section>
    </AuthShell>
  );
}
