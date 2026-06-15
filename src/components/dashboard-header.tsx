import Link from "next/link";
import {
	LayoutDashboard,
	Settings as SettingsIcon,
	UserCircle,
} from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";

type DashboardHeaderProps = {
	title: string;
	userEmail: string;
	locale: Locale;
	onOpenSettings: () => void;
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
}: DashboardHeaderProps) {
	const t = messages[locale];

	return (
		<header className="flex shrink-0 items-center justify-between gap-3 rounded-[var(--radius-card)] bg-surface px-4 py-2">
			<div className="flex min-w-0 items-center gap-3">
				<LayoutDashboard
					size={18}
					strokeWidth={2}
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
				<button
					type="button"
					onClick={onOpenSettings}
					className="flex h-9 shrink-0 items-center gap-2 rounded-full bg-btn pl-3.5 pr-4 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
				>
					<SettingsIcon size={16} />
					{t.dashboard.settings}
				</button>
			</div>
		</header>
	);
}
