"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";
import { GoogleCalendarSettingsPanel } from "@/features/google-calendar/google-calendar-settings-panel";
import { useGoogleCalendar } from "@/features/google-calendar/use-google-calendar";
import { ApiError, apiJson } from "@/lib/api-client";
import type { Account } from "@/lib/auth-client";
import { clearUserCache } from "@/lib/client-cache";
import { resolveLogoutSession } from "@/lib/logout-session";
import { CURRENT_ACCOUNT_QUERY_KEY } from "@/lib/use-required-account";

export function AccountPage({
	email,
	initialLocale,
}: {
	email: string;
	initialLocale: Locale;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const t = messages[initialLocale].auth;
	const googleCalendar = useGoogleCalendar();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
		const [message, setMessage] = useState("");
		const [changingPassword, setChangingPassword] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);

	async function changePassword(event: React.FormEvent) {
			event.preventDefault();
			if (changingPassword) return;
			setChangingPassword(true);
			setMessage("");
			try {
			await apiJson<void>("/api/v1/auth/change-password", {
				method: "POST",
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			queryClient.clear();
			clearUserCache();
			router.replace("/login");
			router.refresh();
			} catch (error) {
				setMessage(error instanceof Error ? error.message : String(error));
			} finally {
				setChangingPassword(false);
		}
	}

	async function logout() {
		if (loggingOut) return;
		setLoggingOut(true);
		setMessage("");
		const result = await resolveLogoutSession(
			() => apiJson<void>("/api/v1/auth/logout", { method: "POST" }),
			() => apiJson<Account>("/api/v1/auth/me"),
			(error) => error instanceof ApiError && [401, 403].includes(error.status),
		);

		if (!result.ended) {
			if (result.account) {
				queryClient.setQueryData(CURRENT_ACCOUNT_QUERY_KEY, result.account);
			}
			setMessage(
				result.error instanceof Error
					? result.error.message
					: initialLocale === "vi"
						? "Không thể đăng xuất. Vui lòng thử lại."
						: "Could not sign out. Please try again.",
			);
			setLoggingOut(false);
			return;
		}

		queryClient.clear();
		clearUserCache();
		router.replace("/login");
		router.refresh();
	}

	return (
		<AuthShell locale={initialLocale}>
			<section className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6">
				<h1 className="text-2xl font-semibold">{t.profile}</h1>
				<p className="mt-2 text-sm text-ink-soft">{email}</p>
				<form
					onSubmit={changePassword}
					className="mt-6 space-y-4"
				>
					<label className="block text-sm font-semibold">
						{t.currentPassword}
						<input
							className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent"
								type="password"
								name="current-password"
								autoComplete="current-password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							required
						/>
					</label>
					<label className="block text-sm font-semibold">
						{t.newPassword}
						<input
							className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent"
								type="password"
								name="new-password"
								autoComplete="new-password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							required
							minLength={12}
						/>
					</label>
						<button type="submit" disabled={changingPassword} className="w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink disabled:cursor-not-allowed disabled:opacity-60">
						{t.changePassword}
					</button>
				</form>
				{message ? (
						<p aria-live="polite" className="mt-4 rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">
						{message}
					</p>
				) : null}
				<button
					type="button"
					onClick={logout}
					disabled={loggingOut}
					className="mt-4 w-full rounded-full bg-surface px-4 py-3 text-sm font-semibold text-ink"
				>
					{t.logout}
				</button>

				<div className="mt-4">
					<GoogleCalendarSettingsPanel
						calendar={googleCalendar}
						locale={initialLocale}
					/>
				</div>
			</section>
		</AuthShell>
	);
}
