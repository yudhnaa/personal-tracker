import Link from "next/link";
import Image from "next/image";
import {
	Settings as SettingsIcon,
	UserCircle,
	LayoutGrid,
	Eye,
	Check,
	Plus,
	X,
	ChevronDown,
} from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./ui/popover";

type DashboardHeaderProps = {
	title: string;
	userEmail: string;
	locale: Locale;
	onOpenSettings: () => void;
	editMode: boolean;
	onStartEdit: () => void;
	onSaveEdit: () => void;
	onCancelEdit: () => void;
	hiddenCards: string[];
	onRestoreCard: (id: string) => void;
	onAddNote: () => void;
	addNoteLabel: string;
	onLogout: () => void;
	loggingOut: boolean;
	logoutError: string;
};

/**
 * Slim header rendered as a bento card (opaque surface, same rounding as the
 * trackers) so it sits flush with the grid. Board title on the left, a single
 * labelled Settings pill on the right (data actions live inside the modal).
 */
export function DashboardHeader({
	title,
	userEmail,
	locale,
	onOpenSettings,
	editMode,
	onStartEdit,
	onSaveEdit,
	onCancelEdit,
	hiddenCards,
	onRestoreCard,
	onAddNote,
	addNoteLabel,
	onLogout,
	loggingOut,
	logoutError,
}: DashboardHeaderProps) {
	const t = messages[locale];

	const cardNames: Record<string, string> = t.dashboard.cardNames;

	return (
		<header className="flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-2">
			<div className="flex min-w-0 items-center gap-3">
				<Image
					src="/logo.png"
					alt="Personal Tracker"
					width={24}
					height={24}
					className="h-6 w-6 rounded-md object-contain"
				/>
				<h1 className="truncate text-lg font-semibold tracking-tight text-ink">
					{title}
				</h1>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<button
					type="button"
					onClick={onAddNote}
					aria-label={addNoteLabel}
					title={addNoteLabel}
					className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
				>
					<Plus size={16} />
					<span className="hidden sm:inline">{addNoteLabel}</span>
				</button>

				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label={t.nav.account}
							className="flex h-9 max-w-[220px] items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
						>
							<UserCircle size={16} />
							<span className="hidden truncate sm:inline">{userEmail}</span>
							<ChevronDown size={14} aria-hidden="true" />
						</button>
					</PopoverTrigger>
					<PopoverContent align="end" className="w-56 p-2">
						<PopoverClose asChild>
							<Link
								href="/account"
								className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-hover"
							>
								<UserCircle size={16} />
								{t.nav.account}
							</Link>
						</PopoverClose>
						<div className="my-1 border-t border-line" />
						{editMode ? (
							<>
								<PopoverClose asChild>
									<button type="button" onClick={onSaveEdit} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover">
										<Check size={16} />
										{t.dashboard.saveLayout}
									</button>
								</PopoverClose>
								<PopoverClose asChild>
									<button type="button" onClick={onCancelEdit} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover">
										<X size={16} />
										{t.dashboard.cancelLayout}
									</button>
								</PopoverClose>
							</>
						) : (
							<PopoverClose asChild>
								<button type="button" onClick={onStartEdit} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover">
									<LayoutGrid size={16} />
									{t.dashboard.editLayout}
								</button>
							</PopoverClose>
						)}
						<PopoverClose asChild>
							<button type="button" onClick={onOpenSettings} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-surface-hover">
								<SettingsIcon size={16} />
								{t.dashboard.settings}
							</button>
						</PopoverClose>
						<div className="my-1 border-t border-line" />
						<button
							type="button"
							onClick={onLogout}
							disabled={loggingOut}
							className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
						>
							{loggingOut ? "Signing out…" : t.auth.logout}
						</button>
						{logoutError ? <p role="alert" className="px-2 pt-2 text-xs text-red-600 dark:text-red-400">{logoutError}</p> : null}
					</PopoverContent>
				</Popover>

				{hiddenCards.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								aria-label={t.dashboard.hiddenCards(hiddenCards.length)}
								title={t.dashboard.hiddenCards(hiddenCards.length)}
								className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
							>
								<Eye size={16} />
								<span className="hidden sm:inline">{t.dashboard.hiddenCards(hiddenCards.length)}</span>
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-56 p-2">
							<div className="mb-2 px-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">
								{t.dashboard.restoreCards}
							</div>
							<div className="flex flex-col gap-1">
								{hiddenCards.map((id) => (
									<button
										key={id}
										type="button"
										onClick={() => onRestoreCard(id)}
										className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
									>
										<span>{id.startsWith("note:") ? cardNames.notes : cardNames[id] || id}</span>
									</button>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}

			</div>
		</header>
	);
}
