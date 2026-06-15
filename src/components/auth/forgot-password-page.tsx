"use client";

import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";

export function ForgotPasswordPage({
	initialLocale,
}: {
	initialLocale: Locale;
}) {
	const t = messages[initialLocale].auth;
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		await fetch("/api/auth/request-password-reset", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, redirectTo: "/reset-password" }),
		});
		const links = await fetch("/api/dev/password-reset-links")
			.then((res) => res.json())
			.catch(() => []);
		setMessage(
			Array.isArray(links) && links[0]?.url
				? `${t.devResetLinks}: ${links[0].url}`
				: t.resetEmailSent,
		);
	}

	return (
		<AuthShell locale={initialLocale}>
			<form
				onSubmit={submit}
				className="w-full max-w-md rounded-[var(--radius-card)] bg-surface-sunken p-6"
			>
				<h1 className="text-2xl font-semibold">{t.resetTitle}</h1>
				<label className="mt-6 block text-sm font-semibold">
					{t.email}
					<input
						className="mt-2 w-full rounded-[var(--radius-inner)] bg-surface px-3 py-2 outline-none ring-1 ring-line focus:ring-accent"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
				</label>
				<button className="mt-6 w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink">
					{t.requestReset}
				</button>
				{message ? (
					<p className="mt-4 break-all rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft">
						{message}
					</p>
				) : null}
			</form>
		</AuthShell>
	);
}
