import Link from "next/link";
import {
	Settings as SettingsIcon,
	UserCircle,
	LayoutGrid,
	Eye,
	Check,
	Plus,
} from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "@/lib/cn";

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

	const cardNames: Record<string, string> = {
		todo: "Todo",
		pomodoro: "Pomodoro",
		notes: "Notes",
		bookmarks: "Bookmarks",
		habits: "Habits",
	};

	return (
		<header className="flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-2">
			<div className="flex min-w-0 items-center gap-3">
				<img
					src="/logo.png"
					alt="Logo"
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

				{editMode && hiddenCards.length > 0 && (
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
							>
								<Eye size={16} />
								<span className="hidden sm:inline">Hidden Cards ({hiddenCards.length})</span>
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-56 p-2">
							<div className="mb-2 px-2 text-xs font-semibold text-ink-soft uppercase tracking-wider">
								Restore Cards
							</div>
							<div className="flex flex-col gap-1">
								{hiddenCards.map((id) => (
									<button
										key={id}
										onClick={() => onRestoreCard(id)}
										className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-ink transition-colors hover:bg-surface-hover"
									>
										<span>{cardNames[id] || id}</span>
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
							className="flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
						>
							<span className="hidden sm:inline">Cancel</span>
						</button>
						<button
							type="button"
							onClick={onSaveEdit}
							className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-accent px-3 text-sm font-semibold text-accent-ink transition-colors hover:opacity-90"
						>
							<Check size={16} />
							<span className="hidden sm:inline">Save Layout</span>
						</button>
					</>
				) : (
					<button
						type="button"
						onClick={onStartEdit}
						className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
					>
						<LayoutGrid size={16} />
						<span className="hidden sm:inline">Edit Layout</span>
					</button>
				)}

				<button
					type="button"
					onClick={onAddNote}
					className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-surface-muted px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
				>
					<Plus size={16} />
					<span className="hidden sm:inline">{addNoteLabel}</span>
				</button>

				<button
					type="button"
					onClick={onOpenSettings}
					className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-btn pl-3.5 pr-4 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
				>
					<SettingsIcon size={16} />
					<span className="hidden sm:inline">{t.dashboard.settings}</span>
				</button>
			</div>
		</header>
	);
}
