"use client";

import Link from "next/link";
import Image from "next/image";
import { LanguageSwitcher } from "../language-switcher";
import { messages, type Locale } from "@/lib/i18n";

export function AuthShell({
  children,
  locale,
  authenticated = false,
}: {
  children: React.ReactNode;
  locale: Locale;
  authenticated?: boolean;
}) {
  const t = messages[locale];
  return (
    <main className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white shadow-2xs">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-slate-200/80 bg-white p-0.5 shadow-2xs">
              <Image
                src="/logo.png"
                alt="Personal Tracker"
                width={28}
                height={28}
                priority
                className="object-contain"
              />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              Personal Tracker
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={authenticated ? "/dashboard" : "/login"}
              className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              {authenticated ? t.nav.dashboard : t.nav.login}
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
        {children}
      </div>
    </main>
  );
}
