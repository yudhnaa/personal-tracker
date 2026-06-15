"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { LanguageSwitcher } from "../language-switcher";
import { messages, type Locale } from "@/lib/i18n";

export function AuthShell({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  const t = messages[locale];
  return (
    <main className="grid min-h-screen bg-surface text-ink lg:grid-cols-[1fr_1.1fr]">
      <section className="hidden bg-[url('/bg-6.jpg')] bg-cover bg-center lg:block" />
      <section className="flex min-h-screen flex-col px-5 py-5">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Clock3 size={18} />
            Personal Tracker
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} />
            <Link href="/dashboard" className="text-sm font-semibold text-ink-soft hover:text-ink">
              {t.nav.dashboard}
            </Link>
          </div>
        </nav>
        <div className="flex flex-1 items-center justify-center py-10">{children}</div>
      </section>
    </main>
  );
}
