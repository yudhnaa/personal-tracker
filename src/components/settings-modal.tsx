import { Check, Moon, Sun, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "../lib/cn";
import { LanguageSwitcher } from "./language-switcher";
import {
	ARCHIVE_DAY_OPTIONS,
	BACKGROUNDS,
	PRIMARY_COLORS,
	PURGE_DAY_OPTIONS,
	type Settings,
} from "../lib/settings";
import { countDoneOlderThan, purgeDoneOlderThan } from "../lib/archived-tasks";
import { useConfirm } from "./confirm-dialog";
import { FieldLabel, TextField } from "./form-controls";
import { Modal } from "./modal";
import { Tooltip } from "./ui/tooltip";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { messages, type Locale } from "@/lib/i18n";
import { GoogleCalendarSettingsPanel } from "@/features/google-calendar/google-calendar-settings-panel";
import type { UseGoogleCalendarResult } from "@/features/google-calendar/use-google-calendar";

type SettingsModalProps = {
	open: boolean;
	settings: Settings;
	onClose: () => void;
	onUpdate: (patch: Partial<Settings>) => void;
	locale: Locale;
	onLocaleChange: (l: Locale) => void;
	googleCalendar: UseGoogleCalendarResult;
	saveError: string | null;
};

export function SettingsModal({
	open,
	settings,
	onClose,
	onUpdate,
	locale,
	onLocaleChange,
	googleCalendar,
	saveError,
}: SettingsModalProps) {
	const confirm = useConfirm();
	const [purgeDays, setPurgeDays] = useState(30);
	const [purging, setPurging] = useState(false);
	const [purgeError, setPurgeError] = useState<string | null>(null);
	const t = messages[locale].components.settings;
	const archiveDayLabels = t.archiveDays;
	const purgeDayLabels = t.purgeDays;
	const colorLabels = t.primaryColors;
	const backgroundLabels = t.backgrounds;

	async function handlePurge() {
		if (purging) return;
		setPurging(true);
		setPurgeError(null);
		try {
			const n = await countDoneOlderThan(purgeDays);
			if (n === 0) {
				await confirm({
					title: t.noTasksTitle,
					message: t.noTasksMessage(purgeDays),
					confirmLabel: messages[locale].components.modal.close,
					cancelLabel: messages[locale].components.confirm.cancel,
				});
				return;
			}
			const ok = await confirm({
				title: t.purgeTitle(n),
				message: t.purgeMessage(purgeDays),
				confirmLabel: t.purgeButton,
				danger: true,
			});
			if (ok) await purgeDoneOlderThan(purgeDays);
		} catch (error) {
			setPurgeError(error instanceof Error ? error.message : String(error));
		} finally {
			setPurging(false);
		}
	}

	return (
		<Modal
			open={open}
			title={t.title}
			onClose={onClose}
		>
			<div className="space-y-5">
				{saveError ? (
					<p className="rounded-[var(--radius-inner)] bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-200">
						{locale === "vi" ? "Không thể lưu cài đặt: " : "Could not save settings: "}
						{saveError}
					</p>
				) : null}
				<div>
					<FieldLabel>{t.boardTitle}</FieldLabel>
					<TextField
						value={settings.boardTitle}
						placeholder={t.boardTitlePlaceholder}
						onChange={(e) => onUpdate({ boardTitle: e.target.value })}
					/>
				</div>

				<div>
					<FieldLabel>{t.appearance}</FieldLabel>
					<div className="grid grid-cols-2 gap-2">
						<ThemeOption
							active={settings.theme === "light"}
							icon={<Sun size={16} />}
							label={t.light}
							onClick={() => onUpdate({ theme: "light" })}
						/>
						<ThemeOption
							active={settings.theme === "dark"}
							icon={<Moon size={16} />}
							label={t.dark}
							onClick={() => onUpdate({ theme: "dark" })}
						/>
					</div>
				</div>

				<div>
					<FieldLabel>{t.language}</FieldLabel>
					<LanguageSwitcher
						locale={locale}
						onChange={onLocaleChange}
					/>
				</div>

				<GoogleCalendarSettingsPanel
					calendar={googleCalendar}
					locale={locale}
				/>

				<div>
					<FieldLabel>{t.primaryColor}</FieldLabel>
					<div className="flex flex-wrap gap-2">
						{PRIMARY_COLORS.map((c, index) => (
							<Tooltip
								key={c.value}
								label={colorLabels[index]}
							>
								<button
									type="button"
									aria-label={colorLabels[index]}
									onClick={() => onUpdate({ primary: c.value })}
									style={{ backgroundColor: c.value }}
									className={cn(
										"grid h-9 w-9 place-items-center rounded-full text-white transition-transform hover:scale-105",
										settings.primary === c.value &&
											"ring-2 ring-ink ring-offset-2 ring-offset-[var(--color-surface)]",
									)}
								>
									{settings.primary === c.value ? <Check size={16} /> : null}
								</button>
							</Tooltip>
						))}
					</div>
				</div>

				<div>
					<FieldLabel>{t.background}</FieldLabel>
					<div className="grid grid-cols-3 gap-2">
						{BACKGROUNDS.map((bg, index) => (
							<Tooltip
								key={bg.value || bg.name}
								label={backgroundLabels[index]}
							>
								<button
									type="button"
									aria-label={backgroundLabels[index]}
									onClick={() => onUpdate({ background: bg.value })}
									className={cn(
										"relative aspect-video overflow-hidden rounded-[var(--radius-inner)] bg-surface-muted ring-2 transition",
										settings.background === bg.value
											? "ring-accent"
											: "ring-transparent hover:ring-line",
									)}
								>
									{bg.value ? (
										<Image
											src={bg.value}
											alt={backgroundLabels[index]}
											fill
											loading="eager"
											sizes="(min-width: 640px) 176px, 30vw"
											className="object-cover"
										/>
									) : (
										<span className="grid h-full place-items-center text-[11px] font-medium text-ink-soft">
											{backgroundLabels[index]}
										</span>
									)}
								</button>
							</Tooltip>
						))}
					</div>
				</div>

				<div className="space-y-4">
					<div>
						<FieldLabel>{t.autoArchive}</FieldLabel>
						<Select
							value={String(settings.archiveDays)}
							onValueChange={(v) => onUpdate({ archiveDays: Number(v) })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ARCHIVE_DAY_OPTIONS.map((o, index) => (
									<SelectItem
										key={o.value}
										value={String(o.value)}
									>
										{archiveDayLabels[index]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<FieldLabel>{t.purgeOlder}</FieldLabel>
						<div className="flex gap-2">
							<div className="flex-1">
								<Select
									value={String(purgeDays)}
									onValueChange={(v) => setPurgeDays(Number(v))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{PURGE_DAY_OPTIONS.map((o, index) => (
											<SelectItem
												key={o.value}
												value={String(o.value)}
											>
												{purgeDayLabels[index]}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							<button
								type="button"
								onClick={handlePurge}
								disabled={purging}
								className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-muted px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
							>
								<Trash2 size={15} />
								{t.purgeButton}
							</button>
							</div>
							{purgeError ? (
								<p role="alert" className="mt-2 text-sm text-red-600">
									{locale === "vi" ? "Không thể xóa công việc: " : "Could not purge tasks: "}
									{purgeError}
								</p>
							) : null}
						</div>

				</div>
			</div>
		</Modal>
	);
}

function ThemeOption({
	active,
	icon,
	label,
	onClick,
}: {
	active: boolean;
	icon: React.ReactNode;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex h-11 items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors",
				active
					? "bg-accent-strong text-white"
					: "bg-surface-muted text-ink-soft hover:bg-surface-hover",
			)}
		>
			{icon}
			{label}
		</button>
	);
}
