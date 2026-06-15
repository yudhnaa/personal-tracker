"use client";

import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";

export function ResetPasswordPage({
	initialLocale,
	token,
}: {
	initialLocale: Locale;
	token: string;
}) {
	const t = messages[initialLocale].auth;
	const [password, setPassword] = useState("");
	const [message, setMessage] = useState("");

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		const response = await fetch("/api/auth/reset-password", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token, newPassword: password }),
		});
		setMessage(response.ok ? t.resetPasswordSuccess : await response.text());
	}

	return (
		<AuthShell locale={initialLocale}>
			<form
				onSubmit={submit}
				className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6"
			>
				<h1 className="text-2xl font-semibold">{t.resetTitle}</h1>
				<label className="mt-6 block text-sm font-semibold">
					{t.newPassword}
					<input
						className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						minLength={8}
					/>
				</label>
				<button className="mt-6 w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink">
					{t.changePassword}
				</button>
				{message ? (
					<p className="mt-4 rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">
						{message}
					</p>
				) : null}
			</form>
		</AuthShell>
	);
}
