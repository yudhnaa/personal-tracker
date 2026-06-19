"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { DashboardHeader } from "./components/dashboard-header";
import { DashboardGrid } from "./components/dashboard-grid";
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
import { useMediaQuery } from "./lib/use-media-query";
import { DEFAULT_SETTINGS } from "./lib/settings";

const WELCOMED_KEY = "pt_welcomed";

export function App({
	userEmail,
	initialLocale,
	initialLayout,
}: {
	userEmail: string;
	initialLocale: Locale;
	initialLayout?: Record<string, Layout>;
}) {
	const { settings, update } = useSettings();
	const googleCalendar = useGoogleCalendar();
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [locale, setLocale] = useState<Locale>(initialLocale);
	const { data: welcomed, setData: setWelcomed } = useApiState<boolean>(
		"/api/welcome",
		false,
	);
	
	const [editMode, setEditMode] = useState(false);
	const [localLayout, setLocalLayout] = useState<Record<string, Layout> | null>(null);
	const [localHiddenCards, setLocalHiddenCards] = useState<string[]>([]);
	const isDesktop = useMediaQuery("(min-width: 1024px)");
	
	const { width, containerRef, mounted } = useContainerWidth();

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

	const activeLayout = editMode 
		? localLayout 
		: (settings.layout && Object.keys(settings.layout).length > 0 ? settings.layout : DEFAULT_SETTINGS.layout);
	
	const activeHiddenCards = editMode 
		? localHiddenCards 
		: (settings.hiddenCards || []);
	
	const hiddenCardsSet = new Set(activeHiddenCards);

	const handleStartEdit = () => {
		setEditMode(true);
		setLocalLayout(settings.layout && Object.keys(settings.layout).length > 0 ? settings.layout : DEFAULT_SETTINGS.layout);
		setLocalHiddenCards(settings.hiddenCards || []);
	};

	const handleSaveEdit = () => {
		update({ layout: localLayout, hiddenCards: localHiddenCards });
		setEditMode(false);
	};

	const handleCancelEdit = () => {
		setEditMode(false);
		setLocalLayout(null);
		setLocalHiddenCards([]);
	};

	const handleLayoutChange = (currentLayout: any, allLayouts: any) => {
		if (editMode && isDesktop) {
			setLocalLayout(allLayouts);
		}
	};

	const handleHideCard = (id: string) => {
		if (editMode) {
			if (!localHiddenCards.includes(id)) {
				setLocalHiddenCards([...localHiddenCards, id]);
			}
		} else {
			const hiddenCards = settings.hiddenCards || [];
			if (!hiddenCards.includes(id)) {
				update({ hiddenCards: [...hiddenCards, id] });
			}
		}
	};

	const handleRestoreCard = (id: string) => {
		if (editMode) {
			setLocalHiddenCards(localHiddenCards.filter((c) => c !== id));
		} else {
			const hiddenCards = settings.hiddenCards || [];
			update({ hiddenCards: hiddenCards.filter((c) => c !== id) });
		}
	};

	const cards = {
		todo: (
			<TodoCard
				className="h-full"
				archiveDays={settings.archiveDays}
				googleCalendar={googleCalendar}
				editMode={editMode && isDesktop}
				onHide={() => handleHideCard("todo")}
			/>
		),
		pomodoro: (
			<PomodoroCard
				className="h-full"
				editMode={editMode && isDesktop}
				onHide={() => handleHideCard("pomodoro")}
			/>
		),
		notes: (
			<NotesCard
				className="h-full"
				editMode={editMode && isDesktop}
				onHide={() => handleHideCard("notes")}
			/>
		),
		bookmarks: (
			<BookmarkCard
				className="h-full"
				editMode={editMode && isDesktop}
				onHide={() => handleHideCard("bookmarks")}
			/>
		),
		habits: (
			<HabitCard
				className="h-full"
				editMode={editMode && isDesktop}
				onHide={() => handleHideCard("habits")}
			/>
		),
	};

	return (
		<div className="min-h-screen p-2">
			<div className="flex flex-col gap-2 rounded-[2rem] bg-shell p-2 backdrop-blur-sm lg:h-[calc(100dvh-1rem)]">
				<DashboardHeader
					title={settings.boardTitle}
					userEmail={userEmail}
					locale={locale}
					onOpenSettings={() => setSettingsOpen(true)}
					editMode={editMode}
					onStartEdit={handleStartEdit}
					onSaveEdit={handleSaveEdit}
					onCancelEdit={handleCancelEdit}
					hiddenCards={activeHiddenCards}
					onRestoreCard={handleRestoreCard}
				/>
				{isDesktop ? (
					<motion.div
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
						className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
					>
						<DashboardGrid
							activeLayout={activeLayout}
							handleLayoutChange={handleLayoutChange}
							editMode={editMode}
						>
								{Object.entries(cards).map(([id, card]) => {
									if (hiddenCardsSet.has(id)) return null;
									return (
										<div key={id} className="h-full w-full">
											{card}
										</div>
									);
								})}
						</DashboardGrid>
					</motion.div>
				) : (
					<motion.div
						initial={{ opacity: 0, y: 14 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
						className="flex min-h-0 flex-1 flex-col gap-2"
					>
						<div className="min-h-[460px]">{cards.todo}</div>
						<div className="flex flex-col gap-2">
							<div className="min-h-[320px] shrink-0">{cards.pomodoro}</div>
							<div className="min-h-[320px] flex-1">{cards.notes}</div>
						</div>
						<div className="min-h-[320px]">{cards.bookmarks}</div>
						<div className="min-h-[320px]">{cards.habits}</div>
					</motion.div>
				)}
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
