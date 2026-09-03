"use client";

import { useState } from "react";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";
import { apiJson } from "@/lib/api-client";

export function ForgotPasswordPage({
	initialLocale,
}: {
	initialLocale: Locale;
}) {
	const t = messages[initialLocale].auth;
	const [email, setEmail] = useState("");
	const [message, setMessage] = useState("");
	const [submitting, setSubmitting] = useState(false);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (submitting) return;
		setSubmitting(true);
		setMessage("");
		try {
			await apiJson<void>("/api/v1/auth/forgot-password", {
				method: "POST",
				body: JSON.stringify({ email }),
			});
			setMessage(t.resetEmailSent);
		} catch (error) {
			setMessage(
				error instanceof Error
					? error.message
					: initialLocale === "vi"
						? "Không thể gửi yêu cầu đặt lại mật khẩu. Vui lòng thử lại."
						: "Could not send the password reset request. Please try again.",
			);
		} finally {
			setSubmitting(false);
		}
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
							name="email"
							autoComplete="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
					/>
				</label>
					<button
						type="submit"
					disabled={submitting}
					className="mt-6 w-full rounded-full bg-btn px-4 py-3 text-sm font-semibold text-btn-ink disabled:cursor-not-allowed disabled:opacity-60"
				>
					{t.requestReset}
				</button>
				{message ? (
					<p
						aria-live="polite"
						className="mt-4 break-all rounded-[var(--radius-inner)] bg-surface p-3 text-sm text-ink-soft"
					>
						{message}
					</p>
				) : null}
			</form>
		</AuthShell>
	);
}
