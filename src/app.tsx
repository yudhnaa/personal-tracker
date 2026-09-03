"use client";

import { motion, useReducedMotion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { type Layout, type ResponsiveLayouts } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { DashboardHeader } from "./components/dashboard-header";
import { DashboardGrid } from "./components/dashboard-grid";
import { SettingsModal } from "./components/settings-modal";
import { StorageAlert } from "./components/storage-alert";
import { WelcomeModal } from "./components/welcome-modal";
import { ApiError, apiJson, ClientSessionChangedError } from "./lib/api-client";
import { useApiState } from "./lib/use-api-state";
import { useSettings } from "./lib/use-settings";
import { BookmarkCard } from "./features/bookmarks/bookmark-card";
import { HabitCard } from "./features/habits/habit-card";
import { NotesCard } from "./features/notes/notes-card";
import { useNotes } from "./features/notes/use-notes";
import { PomodoroCard } from "./features/pomodoro/pomodoro-card";
import { SubscriptionCard } from "./features/subscriptions/subscription-card";
import { TodoCard } from "./features/todo/todo-card";
import { messages, type Locale } from "./lib/i18n";
import { useGoogleCalendar } from "./features/google-calendar/use-google-calendar";
import { useMediaQuery } from "./lib/use-media-query";
import { DEFAULT_SETTINGS } from "./lib/settings";
import type { Account } from "./lib/auth-client";
import { clearUserCache } from "./lib/client-cache";
import { resolveLogoutSession } from "./lib/logout-session";
import { CURRENT_ACCOUNT_QUERY_KEY } from "./lib/use-required-account";

export function App({
	accountId,
	userEmail,
	initialLocale,
}: {
	accountId: string;
	userEmail: string;
	initialLocale: Locale;
}) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const { settings, update, saveError: settingsSaveError } = useSettings(accountId);
	const googleCalendar = useGoogleCalendar();
	const { notes, addNote, patchNote: patchStoredNote, removeNote: removeStoredNote } = useNotes(accountId);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);
	const [logoutError, setLogoutError] = useState("");
	const [locale, setLocale] = useState<Locale>(initialLocale);
	const {
		data: welcomed,
		setData: setWelcomed,
		loading: welcomeLoading,
		error: welcomeError,
	} = useApiState<boolean>(
		"/api/v1/welcome",
		false,
	);
	
	const [editMode, setEditMode] = useState(false);
	const [localLayout, setLocalLayout] = useState<ResponsiveLayouts | null>(null);
	const [localHiddenCards, setLocalHiddenCards] = useState<string[]>([]);
	const isDesktop = useMediaQuery("(min-width: 1024px)");
	const reduceMotion = useReducedMotion();
	
	async function closeWelcome() {
		setWelcomed(true);
		try {
			await apiJson<boolean>("/api/v1/welcome", {
				method: "PATCH",
				body: JSON.stringify({ welcomed: true }),
			});
		} catch (error) {
			if (error instanceof ClientSessionChangedError) return;
			setWelcomed(false);
		}
	}

	async function logout() {
		if (loggingOut) return;
		setLoggingOut(true);
		setLogoutError("");
		const result = await resolveLogoutSession(
			() => apiJson<void>("/api/v1/auth/logout", { method: "POST" }),
			() => apiJson<Account>("/api/v1/auth/me"),
			(error) => error instanceof ApiError && [401, 403].includes(error.status),
		);

		if (!result.ended) {
			if (result.account) queryClient.setQueryData(CURRENT_ACCOUNT_QUERY_KEY, result.account);
			setLogoutError(result.error instanceof Error ? result.error.message : "Could not sign out. Please try again.");
			setLoggingOut(false);
			return;
		}

		queryClient.clear();
		clearUserCache();
		router.replace("/login");
		router.refresh();
	}

	const noteIds = useMemo(() => notes.map((note) => note.id), [notes]);
	const baseLayout = editMode
		? localLayout 
		: (settings.layout && Object.keys(settings.layout).length > 0 ? settings.layout : DEFAULT_SETTINGS.layout);
	const activeLayout = useMemo(() => normalizeLayoutForNotes(baseLayout, noteIds), [baseLayout, noteIds]);
	
	const activeHiddenCards = editMode 
		? localHiddenCards 
		: (settings.hiddenCards || []);
	
	const hiddenCardsSet = new Set(activeHiddenCards);

	const handleStartEdit = () => {
		setEditMode(true);
		setLocalLayout(normalizeLayoutForNotes(settings.layout && Object.keys(settings.layout).length > 0 ? settings.layout : DEFAULT_SETTINGS.layout, noteIds));
		setLocalHiddenCards(settings.hiddenCards || []);
	};

	const handleSaveEdit = () => {
		update({ layout: activeLayout, hiddenCards: localHiddenCards });
		setEditMode(false);
	};

	const handleCancelEdit = () => {
		setEditMode(false);
		setLocalLayout(null);
		setLocalHiddenCards([]);
	};

	const handleLayoutChange = (allLayouts: ResponsiveLayouts) => {
		if (editMode) {
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

	const handleAddNote = async () => {
		try {
			await addNote();
		} catch {
			// The hook restores the server state; keep the dashboard usable.
		}
	};

	const patchNote = useCallback((id: string, patch: { title?: string; text?: string }) => {
		patchStoredNote(id, patch);
	}, [patchStoredNote]);

	const removeNote = useCallback((id: string) => {
		removeStoredNote(id);
	}, [removeStoredNote]);

	const cards: Record<string, ReactNode> = {
		todo: (
			<TodoCard
				className="h-full"
				googleCalendar={googleCalendar}
				editMode={editMode}
				onHide={() => handleHideCard("todo")}
			/>
		),
		pomodoro: (
			<PomodoroCard
				className="h-full"
				editMode={editMode}
				onHide={() => handleHideCard("pomodoro")}
			/>
		),
		bookmarks: (
			<BookmarkCard
				className="h-full"
				editMode={editMode}
				onHide={() => handleHideCard("bookmarks")}
			/>
		),
		habits: (
			<HabitCard
				className="h-full"
				editMode={editMode}
				onHide={() => handleHideCard("habits")}
			/>
		),
		subscriptions: (
			<SubscriptionCard
				className="h-full"
				editMode={editMode}
				onHide={() => handleHideCard("subscriptions")}
			/>
		),
	};

	for (const note of notes) {
		const id = noteCardId(note.id);
		cards[id] = (
			<NotesCard
				note={note}
				className="h-full"
				editMode={editMode}
				onHide={() => handleHideCard(id)}
				onPatch={(patch) => patchNote(note.id, patch)}
				onDelete={() => removeNote(note.id)}
			/>
		);
	}

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
					onAddNote={handleAddNote}
					addNoteLabel={messages[locale].features.notes.addNote}
					onLogout={logout}
					loggingOut={loggingOut}
					logoutError={logoutError}
				/>
				<motion.div
					initial={reduceMotion ? false : { opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={reduceMotion ? { duration: 0 } : { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
					className={isDesktop ? "min-h-0 flex-1 overflow-y-auto overflow-x-hidden" : "w-full"}
				>
					<DashboardGrid
						activeLayout={activeLayout}
						handleLayoutChange={handleLayoutChange}
						editMode={editMode}
						layoutKey={isDesktop ? "lg" : "sm"}
						columns={isDesktop ? 12 : 1}
					>
						{Object.entries(cards).map(([id, card]) => {
							if (hiddenCardsSet.has(id) || (id === noteCardId(noteIds[0] ?? "") && hiddenCardsSet.has("notes"))) return null;
							return <div key={id} className="h-full w-full">{card}</div>;
						})}
					</DashboardGrid>
				</motion.div>
			</div>

			<SettingsModal
				open={settingsOpen}
				settings={settings}
				locale={locale}
				onLocaleChange={setLocale}
				googleCalendar={googleCalendar}
				saveError={settingsSaveError}
				onClose={() => setSettingsOpen(false)}
				onUpdate={update}
			/>

			<WelcomeModal
				open={!welcomeLoading && !welcomeError && welcomed === false}
				locale={locale}
				onClose={closeWelcome}
			/>

			<StorageAlert locale={locale} />
		</div>
	);
}

function noteCardId(noteId: string) {
	return `note:${noteId}`;
}

function normalizeLayoutForNotes(layout: ResponsiveLayouts | null, noteIds: string[]): ResponsiveLayouts {
	const source = layout && Object.keys(layout).length > 0 ? layout : DEFAULT_SETTINGS.layout;
	const lg = Array.isArray(source?.lg) ? [...source.lg] : [...(DEFAULT_SETTINGS.layout?.lg ?? [])];
	const firstNoteId = noteIds[0] ? noteCardId(noteIds[0]) : null;
	const noteIdSet = new Set(noteIds.map(noteCardId));
	const normalized: Layout[number][] = [];
	let migratedFirstNote = false;

	for (const item of lg) {
		if (item.i === "notes") {
			if (firstNoteId && !migratedFirstNote) {
				normalized.push({ ...item, i: firstNoteId });
				migratedFirstNote = true;
			}
			continue;
		}
		if (item.i?.startsWith?.("note:") && !noteIdSet.has(item.i)) continue;
		normalized.push(item);
	}

	for (const noteId of noteIds) {
		const cardId = noteCardId(noteId);
		if (normalized.some((item) => item.i === cardId)) continue;
		const y = normalized.reduce((max, item) => Math.max(max, (item.y ?? 0) + (item.h ?? 8)), 0);
		normalized.push({ i: cardId, x: 8, y, w: 4, h: 18, minW: 3, minH: 10 });
	}

	for (const item of DEFAULT_SETTINGS.layout?.lg ?? []) {
		if (item.i === "notes" || normalized.some((existing) => existing.i === item.i)) continue;
		const y = normalized.reduce((max, existing) => Math.max(max, (existing.y ?? 0) + (existing.h ?? 8)), 0);
		normalized.push({ ...item, y });
	}

	return {
		...source,
		lg: normalized,
		sm: normalizeMobileLayout(source?.sm, normalized, noteIds),
	};
}

function normalizeMobileLayout(
	saved: ReadonlyArray<Layout[number]> | undefined,
	lg: Layout[number][],
	noteIds: string[],
): Layout[number][] {
	const firstNoteId = noteIds[0] ? noteCardId(noteIds[0]) : null;
	const noteIdSet = new Set(noteIds.map(noteCardId));
	const source = (saved?.length ? saved : lg)
		.slice()
		.sort((left, right) => (left.y - right.y) || (left.x - right.x));
	const normalized: Layout[number][] = [];
	let migratedFirstNote = false;

	for (const item of source) {
		let id = item.i;
		if (id === "notes") {
			if (!firstNoteId || migratedFirstNote) continue;
			id = firstNoteId;
			migratedFirstNote = true;
		}
		if (id.startsWith("note:") && !noteIdSet.has(id)) continue;
		if (normalized.some((existing) => existing.i === id)) continue;
		normalized.push({ ...item, i: id });
	}

	for (const item of lg) {
		if (item.i === "notes") continue;
		if (normalized.some((existing) => existing.i === item.i)) continue;
		normalized.push(item);
	}

	let y = 0;
	return normalized.map((item) => {
		const minH = mobileMinimumHeight(item.i);
		const h = saved?.length ? Math.max(item.h ?? 0, minH) : mobileCardHeight(item.i);
		const layoutItem = { ...item, x: 0, y, w: 1, h, minW: 1, minH };
		y += h;
		return layoutItem;
	});
}

function mobileCardHeight(id: string): number {
	if (id === "todo") return 40;
	if (id === "subscriptions") return 30;
	return 28;
}

function mobileMinimumHeight(id: string): number {
	if (id === "todo") return 28;
	if (id === "subscriptions") return 24;
	return 20;
}
