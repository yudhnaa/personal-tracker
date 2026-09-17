import Link from "next/link";
import Image from "next/image";
import {
	Settings as SettingsIcon,
	UserCircle,
	LayoutGrid,
	Eye,
	Plus,
	ChevronDown,
	Image as ImageIcon,
} from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "./ui/popover";

type DashboardHeaderProps = {
	title: string;
	userEmail: string;
	locale: Locale;
	onOpenSettings: () => void;
	onOpenWallpaperAgenda: () => void;
	onOpenAccount: () => void;
	editMode: boolean;
	onStartEdit: () => void;
	onSaveEdit?: () => void;
	onCancelEdit?: () => void;
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
	onOpenWallpaperAgenda,
	onOpenAccount,
	editMode,
	onStartEdit,
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
	const initial = (userEmail ? userEmail.charAt(0) : "U").toUpperCase();

	return (
		<header className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-subtle">
			<div className="max-w-[1720px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
				{/* Logo & App Title */}
				<Link
					href="/"
					className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
					aria-label="Go to home"
				>
					<div className="w-8 h-8 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shadow-xs overflow-hidden p-0.5">
						<Image
							src="/logo.png"
							alt="Personal Tracker"
							width={28}
							height={28}
							priority
							className="object-contain"
						/>
					</div>
					<span className="font-semibold text-base text-slate-900 dark:text-slate-100 tracking-tight">
						{title}
					</span>
				</Link>

				{/* Right Actions: Add Note, Hidden Cards, Profile Dropdown */}
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						onClick={onAddNote}
						aria-label={addNoteLabel}
						title={addNoteLabel}
						className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 border border-slate-200 dark:border-slate-700 rounded-md transition-colors shadow-2xs"
					>
						<Plus size={14} className="text-slate-500 dark:text-slate-400" />
						<span className="hidden sm:inline">{addNoteLabel}</span>
					</button>

					{hiddenCards.length > 0 && (
						<Popover>
							<PopoverTrigger asChild>
								<button
									type="button"
									aria-label={t.dashboard.hiddenCards(hiddenCards.length)}
									title={t.dashboard.hiddenCards(hiddenCards.length)}
									className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
								>
									<Eye size={14} className="text-slate-500 dark:text-slate-400" />
									<span className="hidden sm:inline">{t.dashboard.hiddenCards(hiddenCards.length)}</span>
								</button>
							</PopoverTrigger>
							<PopoverContent align="end" className="w-56 p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg text-xs">
								<div className="px-2 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 mb-1">
									{t.dashboard.restoreCards}
								</div>
								<div className="flex flex-col gap-0.5">
									{hiddenCards.map((id) => (
										<button
											key={id}
											type="button"
											onClick={() => onRestoreCard(id)}
											className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
										>
											<span className="truncate">{id.startsWith("note:") ? cardNames.notes : cardNames[id] || id}</span>
											<Plus size={13} className="text-slate-400" />
										</button>
									))}
								</div>
							</PopoverContent>
						</Popover>
					)}

					{/* Profile Pill & Dropdown */}
					<Popover>
						<PopoverTrigger asChild>
							<button
								type="button"
								aria-label={t.nav.account}
								className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full transition-colors shadow-2xs"
							>
								<div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-bold text-[10px]">
									{initial}
								</div>
								<span className="max-w-[140px] truncate text-slate-700 dark:text-slate-200 font-mono text-[11px]">{userEmail}</span>
								<ChevronDown size={13} className="text-slate-400" />
							</button>
						</PopoverTrigger>
						<PopoverContent align="end" className="w-64 p-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-lg text-xs space-y-1">
							<div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
								<p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{userEmail}</p>
								<p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">{t.dashboard.workspaceOwner}</p>
							</div>
							<PopoverClose asChild>
								<button
									type="button"
									onClick={onOpenAccount}
									className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
								>
									<UserCircle size={15} className="text-slate-500 dark:text-slate-400" />
									<span>{t.nav.account}</span>
								</button>
							</PopoverClose>
							<div className="my-1 border-t border-slate-100 dark:border-slate-800" />
							{!editMode && (
								<PopoverClose asChild>
									<button
										type="button"
										onClick={onStartEdit}
										className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
									>
										<LayoutGrid size={15} className="text-slate-500 dark:text-slate-400" />
										<span>{t.dashboard.editLayout}</span>
									</button>
								</PopoverClose>
							)}
							<PopoverClose asChild>
								<button
									type="button"
									onClick={onOpenSettings}
									className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
								>
									<SettingsIcon size={15} className="text-slate-500 dark:text-slate-400" />
									<span>{t.dashboard.settings}</span>
								</button>
							</PopoverClose>
							<PopoverClose asChild>
								<button
									type="button"
									onClick={onOpenWallpaperAgenda}
									className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors text-left"
								>
									<ImageIcon size={15} className="text-slate-500 dark:text-slate-400" />
									<span>{t.dashboard.wallpaperAgenda}</span>
								</button>
							</PopoverClose>
							<div className="my-1 border-t border-slate-100 dark:border-slate-800" />
							<button
								type="button"
								onClick={onLogout}
								disabled={loggingOut}
								className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left disabled:opacity-50"
							>
								<span>{loggingOut ? t.auth.signingOut : t.auth.logout}</span>
							</button>
							{logoutError ? <p role="alert" className="px-2.5 pt-1 text-xs text-rose-600 dark:text-rose-400">{logoutError}</p> : null}
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</header>
	);
}
