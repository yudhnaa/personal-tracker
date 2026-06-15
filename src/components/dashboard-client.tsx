"use client";

import { App } from "@/app";
import { ConfirmProvider } from "./confirm-dialog";
import { TooltipProvider } from "./ui/tooltip";
import { type Locale } from "@/lib/i18n";

export function DashboardClient({
	userEmail,
	initialLocale,
}: {
	userEmail: string;
	initialLocale: Locale;
}) {
	return (
		<TooltipProvider
			delayDuration={200}
			skipDelayDuration={300}
		>
			<ConfirmProvider>
				<App
					userEmail={userEmail}
					initialLocale={initialLocale}
				/>
			</ConfirmProvider>
		</TooltipProvider>
	);
}
