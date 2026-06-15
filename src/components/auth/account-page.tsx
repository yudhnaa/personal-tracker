"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";
import { GoogleCalendarSettingsPanel } from "@/features/google-calendar/google-calendar-settings-panel";
import { useGoogleCalendar } from "@/features/google-calendar/use-google-calendar";

export function AccountPage({
	email,
	initialLocale,
}: {
	email: string;
	initialLocale: Locale;
}) {
	const router = useRouter();
	const t = messages[initialLocale].auth;
	const googleCalendar = useGoogleCalendar();
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [message, setMessage] = useState("");

	async function changePassword(event: React.FormEvent) {
		event.preventDefault();
		const response = await fetch("/api/auth/change-password", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ currentPassword, newPassword }),
		});
		setMessage(response.ok ? t.passwordChanged : await response.text());
	}

	async function logout() {
		await fetch("/api/auth/sign-out", { method: "POST" });
		router.push("/login");
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
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							required
							minLength={8}
						/>
					</label>
					<button className="w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink">
						{t.changePassword}
					</button>
				</form>
				{message ? (
					<p className="mt-4 rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">
						{message}
					</p>
				) : null}
				<button
					onClick={logout}
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
