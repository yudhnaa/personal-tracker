"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthShell } from "./auth-shell";
import { messages, type Locale } from "@/lib/i18n";
import { apiJson } from "@/lib/api-client";
import { clearUserCache } from "@/lib/client-cache";

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
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
		const [message, setMessage] = useState("");
		const [changingPassword, setChangingPassword] = useState(false);

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

	return (
		<AuthShell locale={initialLocale} authenticated>
			<section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xs">
				<div className="border-b border-slate-100 pb-4">
					<h1 className="text-lg font-semibold tracking-tight text-slate-900">
						{t.profile}
					</h1>
					<p className="mt-1 font-mono text-xs text-slate-500">{email}</p>
				</div>
				<form
					onSubmit={changePassword}
					className="mt-5 space-y-4"
				>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-700">
							{t.currentPassword}
						</label>
						<input
							className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
							type="password"
							name="current-password"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							required
						/>
					</div>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-700">
							{t.newPassword}
						</label>
						<input
							className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20"
							type="password"
							name="new-password"
							autoComplete="new-password"
							value={newPassword}
							onChange={(event) => setNewPassword(event.target.value)}
							required
							minLength={12}
						/>
					</div>
					<button
						type="submit"
						disabled={changingPassword}
						className="flex h-9 w-full items-center justify-center rounded-md bg-[#15803D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
					>
						{changingPassword ? "..." : t.changePassword}
					</button>
				</form>
				{message ? (
					<p aria-live="polite" className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
						{message}
					</p>
				) : null}
			</section>
		</AuthShell>
	);
}
