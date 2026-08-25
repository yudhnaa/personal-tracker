"use client";

import { AccountPage } from "./account-page";
import { type Locale } from "@/lib/i18n";
import { useRequiredAccount } from "@/lib/use-required-account";
import { ApiError } from "@/lib/api-client";

export function AuthenticatedAccountPage({ initialLocale }: { initialLocale: Locale }) {
  const account = useRequiredAccount();
  if (account.isLoading) {
    return <main className="grid min-h-screen place-items-center text-sm text-ink-soft">
      {initialLocale === "vi" ? "Đang tải tài khoản..." : "Loading account..."}
    </main>;
  }
  if (!account.data) {
    const isAuthError = account.error instanceof ApiError && [401, 403].includes(account.error.status);
    if (isAuthError) return null;
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center text-sm text-ink-soft">
        <div className="space-y-3">
          <p>{initialLocale === "vi" ? "Không thể tải tài khoản." : "Account could not be loaded."}</p>
          <button
            type="button"
            onClick={() => void account.refetch()}
            className="rounded-full bg-btn px-4 py-2 font-semibold text-btn-ink"
          >
            {initialLocale === "vi" ? "Thử lại" : "Try again"}
          </button>
        </div>
      </main>
    );
  }
  return <AccountPage email={account.data.email} initialLocale={initialLocale} />;
}
