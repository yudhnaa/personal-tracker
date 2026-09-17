import {
	CalendarClock,
	ChevronLeft,
	ChevronRight,
	Plus,
	RefreshCw,
	ListChecks,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { toIsoDate, todayIso } from "../../lib/date";
import { IconButton } from "../../components/icon-button";
import { Modal } from "../../components/modal";
import { STATUS_META, type Task } from "./task-types";
import { messages, type Locale } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { UseGoogleCalendarResult } from "../google-calendar/use-google-calendar";
import type { GoogleCalendarEvent } from "../google-calendar/types";

type CalendarViewProps = {
	tasks: Task[];
	googleCalendar: UseGoogleCalendarResult;
	onOpenTask: (task: Task) => void;
	onOpenEvent: (event: GoogleCalendarEvent) => void;
	onCreateOn: (dateIso: string) => void;
	onConvertEvent?: (event: GoogleCalendarEvent) => void | Promise<void>;
	onToggleTaskStatus?: (taskId: string, done: boolean) => void;
};

export function CalendarView({
	tasks,
	googleCalendar,
	onOpenTask,
	onOpenEvent,
	onCreateOn,
	onConvertEvent,
	onToggleTaskStatus,
}: CalendarViewProps) {
	const [cursor, setCursor] = useState(() => {
		const d = new Date();
		return { year: d.getFullYear(), month: d.getMonth() };
	});
	const locale = useLocale();
	const t = messages[locale].features.todo;
	const [dayView, setDayView] = useState<string | null>(null);
	const [convertingDay, setConvertingDay] = useState<string | null>(null);

	function getSpanDates(
		startStr: string,
		endStr: string | null | undefined,
		isGoogleAllDay: boolean,
	): string[] {
		const startIso = calendarDateKey(startStr, isGoogleAllDay);
		if (!endStr) return [startIso];
		const endIso = calendarDateKey(endStr, isGoogleAllDay);
		if (startIso === endIso) return [startIso];

		const dates: string[] = [];
		const startD = new Date(startIso + "T00:00:00");
		const endD = new Date(endIso + "T00:00:00");

		if (isGoogleAllDay) {
			endD.setDate(endD.getDate() - 1);
		}

		if (startD > endD) return [startIso];

		const current = new Date(startD);
		while (current <= endD) {
			dates.push(toIsoDate(current));
			current.setDate(current.getDate() + 1);
		}
		return dates.length > 0 ? dates : [startIso];
	}

	const byDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const t of tasks) {
			const startStr = t.dueDate || t.startAt;
			if (!startStr) continue;
			const dates = getSpanDates(startStr, t.endAt, t.allDay ?? false);
			for (const dateKey of dates) {
				const list = map.get(dateKey) ?? [];
				list.push(t);
				map.set(dateKey, list);
			}
		}
		return map;
	}, [tasks]);

	const linkedEventIds = useMemo(() => {
		const keys = new Set<string>();
		for (const task of tasks) {
			if (!task.googleCalendarId || !task.googleEventId) continue;
			const calendarIds = new Set([task.googleCalendarId]);
			if (task.googleCalendarId.includes("@")) calendarIds.add("primary");
			for (const calendarId of calendarIds) {
				if (task.googleCalendarAccountId) {
					keys.add(eventKey(task.googleCalendarAccountId, calendarId, task.googleEventId));
				}
				if (task.googleCalendarConnectionId) {
					keys.add(eventKey(task.googleCalendarConnectionId, calendarId, task.googleEventId));
				}
			}
		}
		return keys;
	}, [tasks]);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, GoogleCalendarEvent[]>();
		for (const event of googleCalendar.events) {
			if (
				linkedEventIds.has(eventKey(event.googleAccountId, event.calendarId, event.id)) ||
				linkedEventIds.has(eventKey(event.connectionId, event.calendarId, event.id))
			) {
				continue;
			}

			const isPending = tasks.some(
				(t) =>
					(t.googleCalendarAccountId ?? t.googleCalendarConnectionId) === event.googleAccountId &&
					t.googleCalendarId === event.calendarId &&
					!t.googleEventId &&
					t.title === event.title,
			);
			if (isPending) continue;

			const dates = getSpanDates(event.start, event.end, event.allDay);
			for (const iso of dates) {
				const list = map.get(iso) ?? [];
				list.push(event);
				map.set(iso, list);
			}
		}
		for (const [iso, events] of map) {
			map.set(
				iso,
				events.sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b))),
			);
		}
		return map;
	}, [googleCalendar.events, linkedEventIds, tasks]);

	const cells = useMemo(
		() => buildMonthCells(cursor.year, cursor.month),
		[cursor],
	);
	const setVisibleRange = googleCalendar.setVisibleRange;

	useEffect(() => {
		const first = cells[0]?.iso;
		const last = cells[cells.length - 1]?.iso;
		if (first && last) setVisibleRange({ start: first, end: last });
	}, [cells, setVisibleRange]);

	function shift(delta: number) {
		setCursor(({ year, month }) => {
			const next = new Date(year, month + delta, 1);
			return { year: next.getFullYear(), month: next.getMonth() };
		});
	}

	const today = todayIso();

	const dayItemsInView = useMemo(
		() => buildDayItems(
			dayView ? (byDate.get(dayView) ?? []) : [],
			dayView ? (eventsByDate.get(dayView) ?? []) : [],
		),
		[byDate, dayView, eventsByDate],
	);
	const dayEventsInView = dayView ? (eventsByDate.get(dayView) ?? []) : [];

	const googleConnected =
		googleCalendar.connection.connected;

	const [dayFilter, setDayFilter] = useState<"all" | "event" | "task">("all");
	const [bannerMessage, setBannerMessage] = useState<string | null>(null);

	function showToast(msg: string) {
		setBannerMessage(msg);
		window.setTimeout(() => {
			setBannerMessage((prev) => (prev === msg ? null : prev));
		}, 3500);
	}

	function shiftDay(deltaDays: number) {
		if (!dayView) return;
		const d = new Date(dayView + "T00:00:00");
		d.setDate(d.getDate() + deltaDays);
		setDayView(toIsoDate(d));
	}

	const allDayItems = dayItemsInView;
	const filteredDayItems = useMemo(() => {
		if (dayFilter === "all") return allDayItems;
		return allDayItems.filter((i) => i.kind === dayFilter);
	}, [allDayItems, dayFilter]);

	const countAll = allDayItems.length;
	const countEvents = dayEventsInView.length;
	const countTasks = allDayItems.filter((i) => i.kind === "task").length;

	async function convertAllDayEvents() {
		if (!dayView || !onConvertEvent || dayEventsInView.length === 0 || convertingDay) {
			showToast(t.calendar.noEventsToConvert);
			return;
		}
		setConvertingDay(dayView);
		try {
			await Promise.all(dayEventsInView.map((event) => onConvertEvent(event)));
			showToast(t.calendar.allEventsConverted);
		} finally {
			setConvertingDay(null);
		}
	}

	async function handleConvertSingle(event: GoogleCalendarEvent) {
		if (!onConvertEvent) return;
		await onConvertEvent(event);
		showToast(t.calendar.convertedEventSuccess(event.title || "Event"));
	}

	return (
		<>
			<div className="flex h-full flex-col">
				<div className="mb-3 flex items-center justify-between">
					<h3 className="text-sm font-semibold text-ink">
						{t.calendar.months[cursor.month]} {cursor.year}
					</h3>
					<div className="flex items-center gap-1.5">
						{googleConnected ? (
							<IconButton
								aria-label={t.calendar.syncNow}
								title={t.calendar.syncNow}
								onClick={() => void googleCalendar.syncNow()}
							>
								<RefreshCw
									size={16}
									className={googleCalendar.syncing ? "animate-spin" : ""}
								/>
							</IconButton>
						) : null}
						<IconButton
							aria-label={t.calendar.prevMonth}
							onClick={() => shift(-1)}
						>
							<ChevronLeft size={18} />
						</IconButton>
						<IconButton
							aria-label={t.calendar.nextMonth}
							onClick={() => shift(1)}
						>
							<ChevronRight size={18} />
						</IconButton>
					</div>
				</div>

				<div className="mb-1.5 grid grid-cols-7 gap-2">
					{t.calendar.weekdays.map((d, index) => (
						<div
							key={index}
							className="text-center text-[11px] font-medium text-ink-faint"
						>
							{d}
						</div>
					))}
				</div>

				<div className="grid min-h-0 flex-1 auto-rows-[minmax(88px,1fr)] grid-cols-7 gap-2 overflow-y-auto">
					{cells.map((cell) => {
						const dayTasks = byDate.get(cell.iso) ?? [];
						const dayEvents = eventsByDate.get(cell.iso) ?? [];
						const dayItems = buildDayItems(dayTasks, dayEvents);
						return (
							<button
								type="button"
								key={cell.iso}
								onClick={() => {
									setDayFilter("all");
									setBannerMessage(null);
									setDayView(cell.iso);
								}}
								className={cn(
									"flex min-h-0 flex-col gap-1 overflow-hidden rounded-[0.85rem] p-1.5 text-left transition-colors",
									cell.inMonth
										? "bg-surface-sunken hover:bg-surface-muted"
										: "bg-transparent",
								)}
							>
								<span
									className={cn(
										"grid h-5 w-5 place-items-center rounded-full text-[11px] font-medium",
										cell.iso === today
											? "bg-accent-strong text-white"
											: cell.inMonth
												? "text-ink-soft"
												: "text-ink-faint/60",
									)}
								>
									{cell.day}
								</span>
								<div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
									{dayItems.slice(0, 3).map((item) =>
										item.kind === "task" ? (
											<span
												key={`task-${item.task.id}`}
												onClick={(e) => {
													e.stopPropagation();
													onOpenTask(item.task);
												}}
												className={cn(
													"flex cursor-pointer items-center justify-between gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
													STATUS_META[item.task.status].chip,
												)}
											>
												<span className="truncate">{item.task.title}</span>
												{item.task.source === "google" && (
													<CalendarClock
														size={10}
														className="shrink-0 opacity-60"
													/>
												)}
											</span>
										) : (
											<span
												key={`event-${item.event.connectionId}-${item.event.calendarId}-${item.event.id}`}
												onClick={(e) => {
													e.stopPropagation();
													onOpenEvent(item.event);
												}}
												className="flex cursor-pointer items-center gap-1 truncate rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
											>
												<CalendarClock
													size={10}
													className="shrink-0"
												/>
												<span className="truncate">
													{formatEventTimeRange(item.event, locale)}{" "}
													{item.event.title}
												</span>
											</span>
										),
									)}
									{dayItems.length > 3 ? (
										<span className="px-1 text-[10px] text-ink-faint">
											+{dayItems.length - 3}
										</span>
									) : null}
								</div>
							</button>
						);
					})}
				</div>
			</div>

			<Modal
				open={dayView !== null}
				title={
					<div className="flex flex-col gap-3">
						<div className="flex flex-wrap items-center gap-2.5">
							<h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
								{dayView ? formatFullDate(dayView, locale) : ""}
							</h3>
							{onConvertEvent && dayEventsInView.length > 0 ? (
								<button
									type="button"
									onClick={() => void convertAllDayEvents()}
									disabled={convertingDay === dayView}
									className="group inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 disabled:cursor-wait disabled:opacity-60"
									title={t.calendar.convertAllEventsToTasks}
								>
									<ListChecks size={14} className="text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-white transition-colors" />
									<span>{t.calendar.convertAllEventsToTasks}</span>
								</button>
							) : null}
						</div>
						{/* Sub-filter bar & Date navigation controls */}
						<div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs">
							{/* Filter Tabs */}
							<div className="flex items-center gap-1.5" role="tablist">
								<button
									type="button"
									onClick={() => setDayFilter("all")}
									className={cn(
										"px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
										dayFilter === "all"
											? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
									)}
								>
									{t.calendar.filterAll}{" "}
									<span className={dayFilter === "all" ? "opacity-80 font-normal ml-0.5" : "text-slate-400 dark:text-slate-500 ml-0.5"}>
										({countAll})
									</span>
								</button>
								<button
									type="button"
									onClick={() => setDayFilter("event")}
									className={cn(
										"px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
										dayFilter === "event"
											? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
									)}
								>
									{t.calendar.filterEvents}{" "}
									<span className={dayFilter === "event" ? "opacity-80 font-normal ml-0.5" : "text-slate-400 dark:text-slate-500 ml-0.5"}>
										({countEvents})
									</span>
								</button>
								<button
									type="button"
									onClick={() => setDayFilter("task")}
									className={cn(
										"px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
										dayFilter === "task"
											? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-semibold"
											: "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800",
									)}
								>
									{t.calendar.filterTasks}{" "}
									<span className={dayFilter === "task" ? "opacity-80 font-normal ml-0.5" : "text-slate-400 dark:text-slate-500 ml-0.5"}>
										({countTasks})
									</span>
								</button>
							</div>
							{/* Mini Date Navigator */}
							<div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
								<button
									type="button"
									onClick={() => shiftDay(-1)}
									className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-0.5"
									title={t.calendar.prevDay}
								>
									<ChevronLeft size={15} />
								</button>
								<button
									type="button"
									onClick={() => setDayView(today)}
									className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded transition-colors"
								>
									{t.calendar.today}
								</button>
								<button
									type="button"
									onClick={() => shiftDay(1)}
									className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-0.5"
									title={t.calendar.nextDay}
								>
									<ChevronRight size={15} />
								</button>
							</div>
						</div>
					</div>
				}
				headerAction={
					<IconButton
						aria-label={t.calendar.addTaskForDay}
						title={t.calendar.addTaskForDay}
						onClick={() => {
							if (dayView) onCreateOn(dayView);
							setDayView(null);
						}}
						className="h-8 w-8 rounded-full bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 active:scale-95 shadow-xs"
					>
						<Plus size={16} />
					</IconButton>
				}
				onClose={() => setDayView(null)}
			>
				<div className="space-y-3">
					{/* Toast banner */}
					{bannerMessage ? (
						<div className="flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3.5 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 transition-all">
							<span>{bannerMessage}</span>
							<button
								type="button"
								onClick={() => setBannerMessage(null)}
								className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 ml-2"
							>
								×
							</button>
						</div>
					) : null}

					{filteredDayItems.length > 0 ? (
						<div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
							{filteredDayItems.map((item) =>
								item.kind === "task" ? (
									<article
										key={`task-${item.task.id}`}
										className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/80 p-3.5 transition-all duration-150 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
									>
										<div className="flex items-center gap-3 min-w-0 flex-1">
											<label
												className="cursor-pointer flex items-center shrink-0"
												onClick={(e) => e.stopPropagation()}
											>
												<input
													type="checkbox"
													checked={item.task.status === "done"}
													onChange={(e) => {
														e.stopPropagation();
														if (onToggleTaskStatus) {
															onToggleTaskStatus(item.task.id, e.target.checked);
														}
													}}
													className="w-4 h-4 rounded text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:ring-slate-900 transition cursor-pointer"
												/>
											</label>
											<div
												className="min-w-0 flex-1 cursor-pointer"
												onClick={() => {
													onOpenTask(item.task);
													setDayView(null);
												}}
											>
												<span
													className={cn(
														"font-medium text-sm text-slate-800 dark:text-slate-200 block truncate transition-colors",
														item.task.status === "done" && "line-through text-slate-400 dark:text-slate-500",
													)}
												>
													{item.task.title}
												</span>
												{item.task.description ? (
													<span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate mt-0.5">
														{item.task.description}
													</span>
												) : null}
											</div>
										</div>
										<span
											className={cn(
												"inline-flex shrink-0 items-center px-3 py-0.5 rounded-full text-xs font-medium border",
												STATUS_META[item.task.status].chip,
											)}
										>
											{t.columns[item.task.status]}
										</span>
									</article>
								) : (
									<article
										key={`event-${item.event.connectionId}-${item.event.calendarId}-${item.event.id}`}
										className="group relative rounded-xl border border-[#ede9fe] dark:border-violet-900/40 bg-[#f5f3ff] dark:bg-violet-950/20 p-3.5 transition-all duration-150 hover:border-[#ddd6fe] dark:hover:border-violet-800/50 hover:shadow-xs"
									>
										<div className="flex items-center justify-between gap-3">
											{/* Left: Icon, Title, and Time */}
											<div
												className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
												onClick={() => {
													onOpenEvent(item.event);
													setDayView(null);
												}}
											>
												<div className="mt-0.5 text-violet-600 dark:text-violet-400 shrink-0">
													<CalendarClock size={20} />
												</div>
												<div className="min-w-0 flex-1">
													<h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 leading-tight truncate">
														{item.event.title}
													</h4>
													<p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-1 truncate">
														{formatEventTimeRange(item.event, locale)}
														{item.event.location ? ` • ${item.event.location}` : ""}
													</p>
												</div>
											</div>
											{/* Right: Google badge & Convert to task action */}
											<div className="flex flex-col items-end gap-1.5 shrink-0">
												<span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-medium text-violet-700 dark:text-violet-300 bg-white/95 dark:bg-violet-900/40 border border-violet-200/90 dark:border-violet-800/50 shadow-2xs">
													{t.calendar.googleEvent}
												</span>
												{onConvertEvent ? (
													<button
														type="button"
														onClick={(e) => {
															e.stopPropagation();
															void handleConvertSingle(item.event);
														}}
														className="text-[12px] font-medium text-violet-600/90 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 flex items-center gap-1 transition-colors hover:underline pt-0.5 active:scale-95"
														title={t.calendar.convertToTask}
													>
														<ListChecks size={13} className="text-violet-500 dark:text-violet-400" />
														<span>{t.calendar.convertToTask}</span>
													</button>
												) : null}
											</div>
										</div>
									</article>
								),
							)}
						</div>
					) : (
						<p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
							{t.calendar.empty}
						</p>
					)}
				</div>
			</Modal>
		</>
	);
}

function formatFullDate(iso: string, locale: Locale): string {
	const d = new Date(iso + "T00:00:00");
	const t = messages[locale].features.todo;
	const weekday = t.calendar.weekdayFullNames[d.getDay()];
	if (locale === "vi") {
		return `${weekday}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
	}
	return `${weekday}, ${t.calendar.months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

type Cell = { iso: string; day: number; inMonth: boolean };

function buildMonthCells(year: number, month: number): Cell[] {
	const first = new Date(year, month, 1);
	const offset = (first.getDay() + 6) % 7; // Mon = 0
	const daysInMonth = new Date(year, month + 1, 0).getDate();
	const weeks = Math.ceil((offset + daysInMonth) / 7);
	const start = new Date(year, month, 1 - offset);
	return Array.from({ length: weeks * 7 }, (_, i) => {
		const d = new Date(
			start.getFullYear(),
			start.getMonth(),
			start.getDate() + i,
		);
		return {
			iso: toIsoDate(d),
			day: d.getDate(),
			inMonth: d.getMonth() === month,
		};
	});
}

type DayItem =
	| { kind: "event"; event: GoogleCalendarEvent; sort: string }
	| { kind: "task"; task: Task; sort: string };

function buildDayItems(
	tasks: Task[],
	events: GoogleCalendarEvent[],
): DayItem[] {
	return [
		...events.map((event) => ({
			kind: "event" as const,
			event,
			sort: eventSortKey(event),
		})),
		...tasks.map((task) => ({
			kind: "task" as const,
			task,
			sort: `z-${task.createdAt}`,
		})),
	].sort((a, b) => a.sort.localeCompare(b.sort));
}

function eventKey(googleAccountId: string, calendarId: string, eventId: string) {
	return `${googleAccountId}:${calendarId}:${eventId}`;
}

function calendarDateKey(value: string, allDay: boolean) {
	if (allDay || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 10);
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value.slice(0, 10) : toIsoDate(date);
}

function eventSortKey(event: GoogleCalendarEvent) {
	return event.allDay ? `00-${event.title}` : `${event.start}-${event.title}`;
}

function formatEventTimeRange(event: GoogleCalendarEvent, locale: Locale) {
	const t = messages[locale].features.todo.calendar;
	if (event.allDay) return t.allDay;
	return `${formatEventTime(event.start, locale)} - ${formatEventTime(event.end, locale)}`;
}

function formatEventTime(value: string, locale: Locale) {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value.slice(11, 16);
	return new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-US", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}
