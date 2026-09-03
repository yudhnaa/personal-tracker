"use client";

import { App } from "@/app";
import { ConfirmProvider } from "./confirm-dialog";
import { TooltipProvider } from "./ui/tooltip";
import { type Locale } from "@/lib/i18n";
import { useRequiredAccount } from "@/lib/use-required-account";
import { ApiError } from "@/lib/api-client";

export function DashboardClient({
	initialLocale,
}: {
	initialLocale: Locale;
}) {
	const account = useRequiredAccount();
	const isAuthError = account.error instanceof ApiError && [401, 403].includes(account.error.status);
	if (account.isLoading) {
		return <main className="grid min-h-screen place-items-center text-sm text-ink-soft">
			{initialLocale === "vi" ? "Đang tải dashboard..." : "Loading dashboard..."}
		</main>;
	}
	if (!account.data) {
		if (isAuthError) return null;
		return (
			<main className="grid min-h-screen place-items-center px-6 text-center text-sm text-ink-soft">
				<div className="space-y-3">
					<p>{initialLocale === "vi" ? "Không thể tải dashboard." : "Dashboard could not be loaded."}</p>
					<button
						type="button"
						onClick={() => void account.refetch()}
						className="cursor-pointer rounded-full bg-btn px-4 py-2 font-semibold text-btn-ink"
					>
						{initialLocale === "vi" ? "Thử lại" : "Try again"}
					</button>
				</div>
			</main>
		);
	}

	return (
		<TooltipProvider
			delayDuration={200}
			skipDelayDuration={300}
		>
			<ConfirmProvider>
				<App
					key={account.data.id}
					accountId={account.data.id}
					userEmail={account.data.email}
					initialLocale={initialLocale}
				/>
			</ConfirmProvider>
		</TooltipProvider>
	);
}
