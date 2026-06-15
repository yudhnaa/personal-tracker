import { CalendarClock, ChevronLeft, ChevronRight, Plus, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { toIsoDate, todayIso } from "../../lib/date";
import { IconButton } from "../../components/icon-button";
import { Modal } from "../../components/modal";
import { STATUS_META, type Task } from "./task-types";
import { messages, type Locale } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import { useConfirm } from "../../components/confirm-dialog";
import {
  GoogleCalendarEventDetailDialog,
  GoogleCalendarEventDialog,
} from "../google-calendar/google-calendar-event-dialog";
import type { UseGoogleCalendarResult } from "../google-calendar/use-google-calendar";
import type { GoogleCalendarEvent, GoogleCalendarEventDraft } from "../google-calendar/types";

type CalendarViewProps = {
  tasks: Task[];
  googleCalendar: UseGoogleCalendarResult;
  onOpen: (task: Task) => void;
  onCreateOn: (dateIso: string) => void;
  onConvert?: (event: GoogleCalendarEvent) => void;
};

/** Month grid that drops each task onto its due date. */
export function CalendarView({ tasks, googleCalendar, onOpen, onCreateOn, onConvert }: CalendarViewProps) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const confirm = useConfirm();
  const locale = useLocale();
  const t = messages[locale].features.todo;
  /** ISO date whose task list is shown in the day-detail dialog, or null. */
  const [dayView, setDayView] = useState<string | null>(null);
  const [createEventDate, setCreateEventDate] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<GoogleCalendarEvent | null>(null);
  const [editEvent, setEditEvent] = useState<GoogleCalendarEvent | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const dateKey = t.startAt ? t.startAt.slice(0, 10) : t.dueDate;
      if (!dateKey) continue;
      const list = map.get(dateKey) ?? [];
      list.push(t);
      map.set(dateKey, list);
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
      
      // If a task is pending sync, it might have been created on Google Calendar 
      // but the local task doesn't have the event ID yet. Hide the event to prevent duplication.
      const isPending = tasks.some(
        (t) => t.googleCalendarId === event.calendarId && !t.googleEventId && t.title === event.title
      );
      if (isPending) continue;

      const iso = eventDate(event);
      const list = map.get(iso) ?? [];
      list.push(event);
      map.set(iso, list);
    }
    for (const [iso, events] of map) {
      map.set(iso, events.sort((a, b) => eventSortKey(a).localeCompare(eventSortKey(b))));
    }
    return map;
  }, [googleCalendar.events, linkedEventIds]);

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

  const googleConnected = googleCalendar.connection.connected && !googleCalendar.connection.reconnectRequired;

  function createGoogleEvent(draft: GoogleCalendarEventDraft) {
    void googleCalendar.createEvent(draft);
  }

  function updateGoogleEvent(event: GoogleCalendarEvent, draft: GoogleCalendarEventDraft) {
    void googleCalendar.updateEvent(event, draft);
  }

  async function deleteGoogleEvent(event: GoogleCalendarEvent) {
    const ok = await confirm({
      title: t.calendar.eventDetail.deleteTitle,
      message: t.calendar.eventDetail.deleteMessage(event.title),
      confirmLabel: t.calendar.eventDetail.deleteConfirm,
      danger: true,
    });
    if (!ok) return;
    await googleCalendar.deleteEvent(event);
    setDetailEvent(null);
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
              <RefreshCw size={16} className={googleCalendar.syncing ? "animate-spin" : ""} />
            </IconButton>
          ) : null}
          <IconButton aria-label={t.calendar.prevMonth} onClick={() => shift(-1)}>
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton aria-label={t.calendar.nextMonth} onClick={() => shift(1)}>
            <ChevronRight size={18} />
          </IconButton>
        </div>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-2">
        {t.calendar.weekdays.map((d, index) => (
          <div key={index} className="text-center text-[11px] font-medium text-ink-faint">
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
                cell.inMonth ? "bg-surface-sunken hover:bg-surface-muted" : "bg-transparent",
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
                {dayItems.slice(0, 3).map((item) => (
                  item.kind === "task" ? (
                    <span
                      key={`task-${item.task.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen(item.task);
                      }}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-1 truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-tight",
                        STATUS_META[item.task.status].chip,
                      )}
                    >
                      <span className="truncate">{item.task.title}</span>
                      {item.task.source === "google" && <CalendarClock size={10} className="shrink-0 opacity-60" />}
                    </span>
                  ) : (
                    <span
                      key={`event-${item.event.calendarId}-${item.event.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailEvent(item.event);
                      }}
                      className="flex cursor-pointer items-center gap-1 truncate rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"
                    >
                      <CalendarClock size={10} className="shrink-0" />
                      <span className="truncate">
                        {formatEventTimeRange(item.event, locale)} {item.event.title}
                      </span>
                    </span>
                  )
                ))}
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
              {dayItemsInView.map((item) => (
                item.kind === "task" ? (
                  <button
                    key={`task-${item.task.id}`}
                    type="button"
                    onClick={() => {
                      onOpen(item.task);
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
                          {item.task.source === "google" ? t.calendar.linkedTask : t.calendar.localTask}
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
                  <button
                    key={`event-${item.event.calendarId}-${item.event.id}`}
                    type="button"
                    onClick={() => {
                      setDetailEvent(item.event);
                      setDayView(null);
                    }}
                    className="flex w-full items-start gap-3 rounded-[var(--radius-inner)] bg-violet-50 px-3 py-2.5 text-left transition-colors hover:bg-violet-100 dark:bg-violet-500/15 dark:hover:bg-violet-500/20"
                  >
                    <CalendarClock size={16} className="mt-0.5 shrink-0 text-violet-600 dark:text-violet-200" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">
                        {item.event.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-violet-700 dark:text-violet-200">
                        {formatEventTimeRange(item.event, locale)}
                        {item.event.location ? ` - ${item.event.location}` : ""}
                      </p>
                    </div>
                    <span className="mt-0.5 shrink-0 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-white/10 dark:text-violet-200">
                      {t.calendar.googleEvent}
                    </span>
                  </button>
                )
              ))}
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
          {googleConnected ? (
            <button
              type="button"
              onClick={() => {
                if (dayView) setCreateEventDate(dayView);
                setDayView(null);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-muted py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-hover"
            >
              <CalendarClock size={16} />
              {t.calendar.addEventForDay}
            </button>
          ) : null}
        </div>
      </Modal>

      <GoogleCalendarEventDialog
        open={createEventDate !== null}
        dateIso={createEventDate ?? undefined}
        calendars={googleCalendar.calendars}
        locale={locale}
        onClose={() => setCreateEventDate(null)}
        onSubmit={createGoogleEvent}
      />

      <GoogleCalendarEventDialog
        open={editEvent !== null}
        event={editEvent}
        calendars={googleCalendar.calendars}
        locale={locale}
        onClose={() => setEditEvent(null)}
        onSubmit={(draft) => {
          if (editEvent) updateGoogleEvent(editEvent, draft);
        }}
      />

      <GoogleCalendarEventDetailDialog
        event={detailEvent}
        locale={locale}
        onClose={() => setDetailEvent(null)}
        onEdit={(event) => {
          setDetailEvent(null);
          setEditEvent(event);
        }}
        onDelete={deleteGoogleEvent}
        onConvert={onConvert}
        formatTimeRange={(event) => formatEventTimeRange(event, locale)}
      />
    </>
  );
}

/** Full localized date label for the day-detail dialog title. */
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

/** Build a Monday-first grid with exactly the weeks the month spans. */
function buildMonthCells(year: number, month: number): Cell[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
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

function buildDayItems(tasks: Task[], events: GoogleCalendarEvent[]): DayItem[] {
  return [
    ...events.map((event) => ({ kind: "event" as const, event, sort: eventSortKey(event) })),
    ...tasks.map((task) => ({ kind: "task" as const, task, sort: `z-${task.createdAt}` })),
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
