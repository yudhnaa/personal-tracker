"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/modal";
import { messages, type Locale } from "@/lib/i18n";
import { apiJson } from "@/lib/api-client";
import { clearUserCache } from "@/lib/client-cache";

type AccountModalProps = {
	open: boolean;
	onClose: () => void;
	email: string;
	locale: Locale;
};

export function AccountModal({
	open,
	onClose,
	email,
	locale,
}: AccountModalProps) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const t = messages[locale].auth;
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
		<Modal
			open={open}
			title={t.profile}
			onClose={onClose}
		>
			<div className="space-y-4">
				<div className="rounded-md border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 px-3.5 py-2.5">
					<span className="block text-[11px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
						{t.email}
					</span>
					<span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
						{email}
					</span>
				</div>

				<form
					onSubmit={changePassword}
					className="space-y-3.5 pt-1"
				>
					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
							{t.currentPassword}
						</label>
						<input
							className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/20"
							type="password"
							name="current-password"
							autoComplete="current-password"
							value={currentPassword}
							onChange={(event) => setCurrentPassword(event.target.value)}
							required
						/>
					</div>

					<div>
						<label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
							{t.newPassword}
						</label>
						<input
							className="h-9 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs text-slate-800 dark:text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:focus:border-slate-500 focus:ring-1 focus:ring-slate-400/20"
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
						className="mt-2 flex h-9 w-full items-center justify-center rounded-md bg-[#15803D] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#166534] disabled:cursor-not-allowed disabled:opacity-50 shadow-xs"
					>
						{changingPassword ? "..." : t.changePassword}
					</button>
				</form>

				{message ? (
					<p
						aria-live="polite"
						className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-700 dark:text-slate-300"
					>
						{message}
					</p>
				) : null}
			</div>
		</Modal>
	);
}
