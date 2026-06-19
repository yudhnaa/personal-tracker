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
	onConvertEvent?: (event: GoogleCalendarEvent) => void;
};

export function CalendarView({
	tasks,
	googleCalendar,
	onOpenTask,
	onOpenEvent,
	onCreateOn,
	onConvertEvent,
}: CalendarViewProps) {
	const [cursor, setCursor] = useState(() => {
		const d = new Date();
		return { year: d.getFullYear(), month: d.getMonth() };
	});
	const locale = useLocale();
	const t = messages[locale].features.todo;
	const [dayView, setDayView] = useState<string | null>(null);

	function getSpanDates(
		startStr: string,
		endStr: string | null | undefined,
		isGoogleAllDay: boolean,
	): string[] {
		const startIso = startStr.slice(0, 10);
		if (!endStr) return [startIso];
		const endIso = endStr.slice(0, 10);
		if (startIso === endIso) return [startIso];

		const dates: string[] = [];
		const startD = new Date(startIso + "T00:00:00");
		const endD = new Date(endIso + "T00:00:00");

		if (isGoogleAllDay) {
			endD.setDate(endD.getDate() - 1);
		}

		if (startD > endD) return [startIso];

		let current = new Date(startD);
		while (current <= endD) {
			dates.push(toIsoDate(current));
			current.setDate(current.getDate() + 1);
		}
		return dates.length > 0 ? dates : [startIso];
	}

	const byDate = useMemo(() => {
		const map = new Map<string, Task[]>();
		for (const t of tasks) {
			const startStr = t.startAt || t.dueDate;
			if (!startStr) continue;
			const dates = getSpanDates(startStr, t.endAt, false);
			for (const dateKey of dates) {
				const list = map.get(dateKey) ?? [];
				list.push(t);
				map.set(dateKey, list);
			}
		}
		return map;
	}, [tasks]);

	const linkedEventIds = useMemo(() => {
		return new Set(tasks.map((t) => t.googleEventId).filter(Boolean));
	}, [tasks]);

	const eventsByDate = useMemo(() => {
		const map = new Map<string, GoogleCalendarEvent[]>();
		for (const event of googleCalendar.events) {
			if (linkedEventIds.has(event.id)) continue;

			const isPending = tasks.some(
				(t) =>
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

	const dayTasksInView = dayView ? (byDate.get(dayView) ?? []) : [];
	const dayEventsInView = dayView ? (eventsByDate.get(dayView) ?? []) : [];
	const dayItemsInView = useMemo(
		() => buildDayItems(dayTasksInView, dayEventsInView),
		[dayEventsInView, dayTasksInView],
	);

	const googleConnected =
		googleCalendar.connection.connected &&
		!googleCalendar.connection.reconnectRequired;

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
								onClick={() => setDayView(cell.iso)}
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
												key={`event-${item.event.calendarId}-${item.event.id}`}
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
				title={dayView ? formatFullDate(dayView, locale) : ""}
				onClose={() => setDayView(null)}
			>
				<div className="space-y-3">
					{dayItemsInView.length > 0 ? (
						<div className="space-y-1.5">
							{dayItemsInView.map((item) =>
								item.kind === "task" ? (
									<button
										key={`task-${item.task.id}`}
										type="button"
										onClick={() => {
											onOpenTask(item.task);
											setDayView(null);
										}}
										className="flex w-full items-start gap-3 rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2.5 text-left transition-colors hover:bg-surface-muted"
									>
										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-2">
												<p className="truncate text-sm font-medium text-ink">
													{item.task.title}
												</p>
												<span className="shrink-0 rounded-[0.25rem] bg-surface-muted px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-ink-soft uppercase">
													{item.task.source === "google"
														? t.calendar.linkedTask
														: t.calendar.localTask}
												</span>
											</div>
											{item.task.description ? (
												<p className="mt-0.5 truncate text-xs text-ink-faint">
													{item.task.description}
												</p>
											) : null}
										</div>
										<span
											className={cn(
												"mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
												STATUS_META[item.task.status].chip,
											)}
										>
											{STATUS_META[item.task.status].label}
										</span>
									</button>
								) : (
									<div
										key={`event-${item.event.calendarId}-${item.event.id}`}
										className="group flex w-full items-start gap-3 rounded-[var(--radius-inner)] bg-violet-50 px-3 py-2.5 text-left transition-colors hover:bg-violet-100 dark:bg-violet-500/15 dark:hover:bg-violet-500/20"
									>
										<button
											type="button"
											onClick={() => {
												onOpenEvent(item.event);
												setDayView(null);
											}}
											className="flex min-w-0 flex-1 items-start gap-3 text-left"
										>
											<CalendarClock
												size={16}
												className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-200"
											/>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-medium text-ink">
													{item.event.title}
												</p>
												<p className="mt-0.5 truncate text-xs text-violet-700 dark:text-violet-200">
													{formatEventTimeRange(item.event, locale)}
													{item.event.location ? ` - ${item.event.location}` : ""}
												</p>
											</div>
										</button>
										<div className="flex shrink-0 flex-col items-end gap-1.5">
											<span className="mt-0.5 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">
												{t.calendar.googleEvent}
											</span>
											{onConvertEvent && (
												<button
													type="button"
													onClick={(e) => {
														e.stopPropagation();
														onConvertEvent(item.event);
														setDayView(null);
													}}
													className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold text-violet-600 opacity-0 transition-all hover:bg-violet-200/50 group-hover:opacity-100 dark:text-violet-300 dark:hover:bg-violet-400/30"
												>
													<ListChecks size={12} />
													{t.calendar.convertToTask}
												</button>
											)}
										</div>
									</div>
								),
							)}
						</div>
					) : (
						<p className="py-2 text-center text-sm text-ink-faint">
							{t.calendar.empty}
						</p>
					)}

					<button
						type="button"
						onClick={() => {
							if (dayView) onCreateOn(dayView);
							setDayView(null);
						}}
						className="flex w-full items-center justify-center gap-2 rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
					>
						<Plus size={16} />
						{t.calendar.addTaskForDay}
					</button>
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

function eventDate(event: GoogleCalendarEvent) {
	return event.start.slice(0, 10);
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
