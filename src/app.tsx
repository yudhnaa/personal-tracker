"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { DashboardHeader } from "./components/dashboard-header";
import { SettingsModal } from "./components/settings-modal";
import { StorageAlert } from "./components/storage-alert";
import { WelcomeModal } from "./components/welcome-modal";
import { apiJson } from "./lib/api-client";
import { useApiState } from "./lib/use-api-state";
import { useSettings } from "./lib/use-settings";
import { BookmarkCard } from "./features/bookmarks/bookmark-card";
import { HabitCard } from "./features/habits/habit-card";
import { NotesCard } from "./features/notes/notes-card";
import { PomodoroCard } from "./features/pomodoro/pomodoro-card";
import { TodoCard } from "./features/todo/todo-card";
import { type Locale } from "./lib/i18n";
import { useGoogleCalendar } from "./features/google-calendar/use-google-calendar";

const WELCOMED_KEY = "pt_welcomed";

/**
 * Bento dashboard shell: a photographic background, a translucent padded
 * container with a page header. Todo owns the 2x2 hero; the right column
 * stacks Pomodoro (hugging its content) over Notes (filling the rest); the
 * bottom row holds Bookmark + Habits. Personalization lives in
 * settings and is applied to the DOM by useSettings.
 */
export function App({
	userEmail,
	initialLocale,
}: {
	userEmail: string;
	initialLocale: Locale;
}) {
	const { settings, update } = useSettings();
	const googleCalendar = useGoogleCalendar();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [locale, setLocale] = useState<Locale>(initialLocale);
	const { data: welcomed, setData: setWelcomed } = useApiState<boolean>(
		"/api/welcome",
		false,
	);

	// Read localStorage on mount to prevent flash; sync back when welcomed changes
	useEffect(() => {
		if (welcomed) {
			localStorage.setItem(WELCOMED_KEY, "true");
		} else if (localStorage.getItem(WELCOMED_KEY) === "true") {
			setWelcomed(true);
		}
	}, [welcomed, setWelcomed]);

	function closeWelcome() {
		setWelcomed(true);
		localStorage.setItem(WELCOMED_KEY, "true");
		void apiJson<boolean>("/api/welcome", {
			method: "PATCH",
			body: JSON.stringify({ welcomed: true }),
		});
	}

	return (
		<div className="min-h-screen p-2">
			<div className="flex flex-col gap-2 rounded-[2rem] bg-shell p-2 backdrop-blur-sm lg:h-[calc(100dvh-1rem)]">
				<DashboardHeader
					title={settings.boardTitle}
					userEmail={userEmail}
					locale={locale}
					onOpenSettings={() => setSettingsOpen(true)}
				/>
				<motion.div
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
					className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:grid-rows-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,4fr)]"
				>
					<TodoCard
						className="min-h-[460px] lg:col-span-2 lg:row-span-2 lg:min-h-0"
						archiveDays={settings.archiveDays}
						googleCalendar={googleCalendar}
					/>

					{/* Right column: Pomodoro takes only the height it needs, Notes fills the rest. */}
					<div className="flex min-h-0 flex-col gap-2 lg:col-start-3 lg:row-span-3 lg:row-start-1">
						<PomodoroCard className="min-h-[320px] lg:min-h-0 lg:shrink-0" />
						<NotesCard className="min-h-[320px] lg:min-h-0 lg:flex-1" />
					</div>

					<BookmarkCard className="min-h-[320px] lg:col-start-1 lg:row-start-3 lg:min-h-0" />
					<HabitCard className="min-h-[320px] lg:col-start-2 lg:row-start-3 lg:min-h-0" />
				</motion.div>
			</div>

			<SettingsModal
				open={settingsOpen}
				settings={settings}
				locale={locale}
				onLocaleChange={setLocale}
				googleCalendar={googleCalendar}
				onClose={() => setSettingsOpen(false)}
				onUpdate={update}
			/>

			<WelcomeModal
				open={!welcomed}
				locale={locale}
				onClose={closeWelcome}
			/>

			<StorageAlert locale={locale} />
		</div>
	);
}
