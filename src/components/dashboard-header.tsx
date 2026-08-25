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
} from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

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
				<Link
					href="/account"
					className="hidden h-9 max-w-[220px] items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink sm:flex"
				>
					<UserCircle size={16} />
					<span className="truncate">{userEmail}</span>
				</Link>

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

				{editMode ? (
					<>
						<button
							type="button"
							onClick={onCancelEdit}
							aria-label={t.dashboard.cancelLayout}
							title={t.dashboard.cancelLayout}
							className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
						>
							<X size={16} />
							<span className="hidden sm:inline">{t.dashboard.cancelLayout}</span>
						</button>
						<button
							type="button"
							onClick={onSaveEdit}
							aria-label={t.dashboard.saveLayout}
							title={t.dashboard.saveLayout}
							className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink transition-colors hover:opacity-90"
						>
							<Check size={16} />
							<span className="hidden sm:inline">{t.dashboard.saveLayout}</span>
						</button>
					</>
				) : (
					<button
						type="button"
						onClick={onStartEdit}
						aria-label={t.dashboard.editLayout}
						title={t.dashboard.editLayout}
						className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
					>
						<LayoutGrid size={16} />
						<span className="hidden sm:inline">{t.dashboard.editLayout}</span>
					</button>
				)}

				<button
					type="button"
					onClick={onAddNote}
					aria-label={addNoteLabel}
					title={addNoteLabel}
					className="hidden h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover lg:flex"
				>
					<Plus size={16} />
					<span className="hidden sm:inline">{addNoteLabel}</span>
				</button>

				<button
					type="button"
					onClick={onOpenSettings}
					aria-label={t.dashboard.settings}
					title={t.dashboard.settings}
					className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-btn pl-3.5 pr-4 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
				>
					<SettingsIcon size={16} />
					<span className="hidden sm:inline">{t.dashboard.settings}</span>
				</button>
			</div>
		</header>
	);
}
