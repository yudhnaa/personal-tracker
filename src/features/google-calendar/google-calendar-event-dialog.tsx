"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "@/components/icon-button";
import { Modal } from "@/components/modal";
import { DatePicker } from "@/components/ui/date-picker";
import { messages, type Locale } from "@/lib/i18n";
import type {
  GoogleCalendarEvent,
  GoogleCalendarEventDraft,
  GoogleCalendarListItem,
} from "./types";

type GoogleCalendarEventDialogProps = {
  open: boolean;
  event?: GoogleCalendarEvent | null;
  dateIso?: string;
  calendars: GoogleCalendarListItem[];
  locale: Locale;
  onClose: () => void;
  onSubmit: (draft: GoogleCalendarEventDraft) => void;
};

export function GoogleCalendarEventDialog({
  open,
  event,
  dateIso,
  calendars,
  locale,
  onClose,
  onSubmit,
}: GoogleCalendarEventDialogProps) {
  const t = messages[locale].features.todo.calendar.eventDialog;
  const [calendarId, setCalendarId] = useState("");
  const [date, setDate] = useState(dateIso ?? "");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const enabledCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.selected),
    [calendars],
  );
  const calendarOptions = event ? calendars : enabledCalendars;

  useEffect(() => {
    if (!open) return;
    const firstCalendar = event
      ? calendars.find((calendar) => calendar.id === event.calendarId) ?? calendars[0]
      : enabledCalendars[0];
    setCalendarId(event?.calendarId ?? firstCalendar?.id ?? "");
    setDate(event ? datePart(event.start) : (dateIso ?? ""));
    setStartTime(event ? timePart(event.start, "09:00") : "09:00");
    setEndTime(event ? timePart(event.end, "10:00") : "10:00");
    setTitle(event?.title ?? "");
    setLocation(event?.location ?? "");
    setDescription(event?.description ?? "");
  }, [calendars, dateIso, enabledCalendars, event, open]);

  function submit() {
    const cleanTitle = title.trim();
    if (!cleanTitle || !date || !calendarId) return;
    onSubmit({
      calendarId,
      title: cleanTitle,
      location,
      description,
      start: `${date}T${startTime}:00`,
      end: `${date}T${endTime}:00`,
      allDay: false,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      wide
      title={event ? t.editTitle : t.addTitle}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.titleLabel}
          </p>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t.titlePlaceholder}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.calendarLabel}
          </p>
          <select
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            disabled={Boolean(event) || !calendarOptions.length}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {calendarOptions.length ? (
              calendarOptions.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.summary}
                </option>
              ))
            ) : (
              <option value="">{t.noSyncedCalendars}</option>
            )}
          </select>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.dateLabel}
          </p>
          <DatePicker
            value={date}
            onChange={setDate}
            placeholder={t.datePlaceholder}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.startTimeLabel}
            </span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.endTimeLabel}
            </span>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.locationLabel}
          </p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t.locationPlaceholder}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.descriptionLabel}
          </p>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.descriptionPlaceholder}
            className="w-full resize-none rounded-[var(--radius-inner)] bg-surface-muted p-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={!calendarId}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {event ? t.save : t.create}
        </button>
      </div>
    </Modal>
  );
}

type GoogleCalendarEventDetailDialogProps = {
  event: GoogleCalendarEvent | null;
  locale: Locale;
  onClose: () => void;
  onEdit: (event: GoogleCalendarEvent) => void;
  onDelete: (event: GoogleCalendarEvent) => void;
  onConvert?: (event: GoogleCalendarEvent) => void;
  formatTimeRange: (event: GoogleCalendarEvent) => string;
};

export function GoogleCalendarEventDetailDialog({
  event,
  locale,
  onClose,
  onEdit,
  onDelete,
  onConvert,
  formatTimeRange,
}: GoogleCalendarEventDetailDialogProps) {
  const t = messages[locale].features.todo.calendar.eventDetail;

  if (!event) {
    return <Modal open={false} title="" onClose={onClose} children={null} />;
  }

  const headerAction = (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label={t.edit}
        title={t.edit}
        onClick={() => onEdit(event)}
        className="bg-transparent text-ink-faint hover:bg-surface-muted hover:text-ink"
      >
        <Pencil size={16} />
      </IconButton>
      {onConvert && (
        <IconButton
          aria-label={t.convertToTask}
          title={t.convertToTask}
          onClick={() => { onConvert(event); onClose(); }}
          className="bg-transparent text-ink-faint hover:bg-surface-muted hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </IconButton>
      )}
      <IconButton
        aria-label={t.delete}
        title={t.delete}
        onClick={() => onDelete(event)}
        className="bg-transparent text-ink-faint hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15"
      >
        <Trash2 size={16} />
      </IconButton>
    </div>
  );

  return (
    <Modal
      open
      wide
      title={t.title}
      headerAction={headerAction}
      onClose={onClose}
    >
      <div className="space-y-5">
        <div>
          <p className="break-words text-lg font-semibold leading-snug text-ink">
            {event.title}
          </p>
          <p className="mt-1 text-sm font-medium text-violet-700 dark:text-violet-200">
            {formatTimeRange(event)}
          </p>
        </div>

        <DetailBlock label={t.locationLabel}>
          {event.location || t.noLocation}
        </DetailBlock>

        <DetailBlock label={t.descriptionLabel}>
          {event.description || t.noDescription}
        </DetailBlock>
      </div>
    </Modal>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="min-h-10 whitespace-pre-wrap break-words rounded-[var(--radius-inner)] bg-surface-sunken p-3 text-sm leading-relaxed text-ink">
        {children}
      </p>
    </div>
  );
}

function datePart(value: string) {
  return value.slice(0, 10);
}

function timePart(value: string, fallback: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(11, 16) || fallback;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
