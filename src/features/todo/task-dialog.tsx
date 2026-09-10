import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "../../lib/cn";
import { toIsoDate } from "../../lib/date";
import { Modal } from "../../components/modal";
import { DatePicker } from "../../components/ui/date-picker";
import { TaskChecklist } from "./task-checklist";
import { STATUS_META, TASK_STATUSES, type Task } from "./task-types";
import type { TaskDraft } from "./use-todos";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { GoogleCalendarListItem } from "../google-calendar/types";

export type ItemType = "task" | "event";

export type ItemDialogDraft = TaskDraft & {
  type: ItemType;
  googleCalendarConnectionId?: string;
  googleCalendarAccountId?: string;
  googleCalendarId?: string;
};

type ItemDialogProps = {
  open: boolean;
  /** Prefilled fields (status from a column, due date from the calendar). */
  task: Task | null;
  /** Initial type if we are strictly opening a task or an event by default */
  defaultType?: ItemType;
  googleCalendarConnected?: boolean;
  googleCalendars?: GoogleCalendarListItem[];
  onClose: () => void;
  onSubmit: (draft: ItemDialogDraft) => Promise<boolean>;
};

const EMPTY: ItemDialogDraft = {
  type: "task",
  title: "",
  description: "",
  dueDate: "",
  status: "todo",
  checklist: [],
  googleCalendarConnectionId: "",
  googleCalendarAccountId: "",
  googleCalendarId: "",
  startAt: "",
  endAt: "",
  allDay: false,
  location: "",
};

export function TaskDialog({
	...props
}: ItemDialogProps) {
	const instanceKey = props.open
		? `open:${props.task?.id ?? "new"}:${props.defaultType ?? "task"}`
		: "closed";
	return <TaskDialogForm key={instanceKey} {...props} />;
}

function TaskDialogForm({
  open,
  task,
  defaultType = "task",
  googleCalendarConnected = false,
  googleCalendars = [],
  onClose,
  onSubmit,
}: ItemDialogProps) {
  const locale = useLocale();
  const t = messages[locale].features.todo;
  const enabledGoogleCalendars = useMemo(
    () => (googleCalendarConnected ? googleCalendars.filter((calendar) => calendar.selected) : []),
    [googleCalendarConnected, googleCalendars],
  );
  const [draft, setDraft] = useState<ItemDialogDraft>(() => {
    const firstCalendar = enabledGoogleCalendars[0];
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    return task && task.id
        ? {
            type: defaultType,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            checklist: task.checklist ?? [],
            googleCalendarConnectionId: task.googleCalendarConnectionId || (task.dueDate ? firstCalendar?.connectionId ?? "" : ""),
            googleCalendarAccountId: task.googleCalendarAccountId || (task.dueDate ? firstCalendar?.googleAccountId ?? "" : ""),
            googleCalendarId: task.googleCalendarId || (task.dueDate ? firstCalendar?.id ?? "" : ""),
            startAt: task.startAt ?? "",
            endAt: task.endAt ?? "",
            allDay: task.allDay ?? false,
            location: task.location ?? "",
          }
        : {
            ...EMPTY,
            type: defaultType,
            googleCalendarConnectionId: "",
            googleCalendarAccountId: "",
            googleCalendarId: "",
            startAt: now.toISOString(),
            endAt: oneHourLater.toISOString(),
            dueDate: task?.dueDate || format(now, "yyyy-MM-dd"),
            status: task?.status || "todo",
          };
  });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submit() {
    if (saving || !draft.title.trim()) return;
    if (draft.type === "event" && (!draft.googleCalendarConnectionId || !draft.googleCalendarId)) return;
    if (draft.type === "event" && (!draft.startAt || !draft.endAt)) {
      alert(t.dialog.eventTimesRequired);
      return;
    }
    const selectedCalendar = enabledGoogleCalendars.find(
      (calendar) => calendar.connectionId === draft.googleCalendarConnectionId && calendar.id === draft.googleCalendarId,
    );
    setSaving(true);
    setSubmitError(null);
    const normalizedDraft = draft.allDay ? draft : normalizeDraftTimedRange(draft, draft, false, false);
    try {
      const saved = await onSubmit({
        ...normalizedDraft,
        title: normalizedDraft.title.trim(),
        googleCalendarConnectionId: (normalizedDraft.startAt || normalizedDraft.dueDate || normalizedDraft.type === "event") ? normalizedDraft.googleCalendarConnectionId : undefined,
        googleCalendarAccountId: (normalizedDraft.startAt || normalizedDraft.dueDate || normalizedDraft.type === "event") ? selectedCalendar?.googleAccountId ?? normalizedDraft.googleCalendarAccountId : undefined,
        googleCalendarId: (normalizedDraft.startAt || normalizedDraft.dueDate || normalizedDraft.type === "event") ? normalizedDraft.googleCalendarId : undefined,
      });
      if (saved) onClose();
      else setSubmitError(t.dialog.saveError);
    } catch {
      setSubmitError(t.dialog.saveError);
    } finally {
      setSaving(false);
    }
  }

  const isEvent = draft.type === "event";

  const typeToggle = (
    <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
      <button
        type="button"
        onClick={() => setDraft((d) => ({ ...d, type: "task" }))}
        className={cn(
          "flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
          !isEvent ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
        )}
      >
        {t.dialog.taskType}
      </button>
      {googleCalendarConnected && (
        <button
          type="button"
          onClick={() => setDraft((d) => ({
            ...d,
            type: "event",
            googleCalendarConnectionId: d.googleCalendarConnectionId || enabledGoogleCalendars[0]?.connectionId || "",
            googleCalendarAccountId: d.googleCalendarAccountId || enabledGoogleCalendars[0]?.googleAccountId || "",
            googleCalendarId: d.googleCalendarId || enabledGoogleCalendars[0]?.id || "",
          }))}
          className={cn(
            "flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            isEvent ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          )}
        >
          {t.dialog.eventType}
        </button>
      )}
    </div>
  );

  const statusPills = (
    <div className="flex flex-wrap gap-1.5 mt-4">
      {TASK_STATUSES.map((s) => {
        const active = draft.status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setDraft((d) => ({ ...d, status: s }))}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-accent-strong text-white"
                : "bg-surface-muted text-ink-soft hover:bg-surface-hover",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                active ? "bg-white/80" : STATUS_META[s].dot,
              )}
            />
            {t.columns[s]}
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal open={open} title={typeToggle} onClose={onClose}>
      <div className="space-y-5">
        {!isEvent && statusPills}

        {/* Title. */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.dialog.titleLabel}
          </p>
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            placeholder={t.dialog.titlePlaceholder}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Date & Time */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.dialog.dateTimeLabel}
            </p>
            <label className="flex items-center gap-2 text-sm text-ink-faint cursor-pointer">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => setDraft((d) => ({ ...d, allDay: e.target.checked }))}
                className="rounded border-surface-muted accent-accent"
              />
              {t.dialog.allDayLabel}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {draft.allDay ? (
              <>
                <DatePicker
                  value={draft.startAt ?? draft.dueDate}
                  onChange={(iso) =>
                    setDraft((d) => ({
                      ...d,
                      startAt: iso,
                      dueDate: iso,
                    googleCalendarConnectionId: iso ? d.googleCalendarConnectionId || enabledGoogleCalendars[0]?.connectionId || "" : "",
                    googleCalendarAccountId: iso ? d.googleCalendarAccountId || enabledGoogleCalendars[0]?.googleAccountId || "" : "",
                    googleCalendarId: iso ? d.googleCalendarId || enabledGoogleCalendars[0]?.id || "" : "",
                    }))
                  }
                  placeholder={t.dialog.startDatePlaceholder}
                />
                <DatePicker
                  value={draft.endAt ?? ""}
                  onChange={(iso) => setDraft((d) => ({ ...d, endAt: iso }))}
                  placeholder={t.dialog.endDatePlaceholder}
                />
              </>
            ) : (
              <>
                <input
                  type="datetime-local"
                  value={
                    draft.startAt && !isNaN(new Date(draft.startAt).getTime())
                      ? format(new Date(draft.startAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    const iso = date ? date.toISOString() : "";
                    setDraft((d) => normalizeDraftTimedRange(d, {
                      ...d,
                      startAt: iso,
                      dueDate: date ? toIsoDate(date) : "",
                    googleCalendarConnectionId: iso ? d.googleCalendarConnectionId || enabledGoogleCalendars[0]?.connectionId || "" : "",
                    googleCalendarAccountId: iso ? d.googleCalendarAccountId || enabledGoogleCalendars[0]?.googleAccountId || "" : "",
                    googleCalendarId: iso ? d.googleCalendarId || enabledGoogleCalendars[0]?.id || "" : "",
                    }, true, false));
                  }}
                  className="w-full flex-1 rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
                />
                <input
                  type="datetime-local"
                  value={
                    draft.endAt && !isNaN(new Date(draft.endAt).getTime())
                      ? format(new Date(draft.endAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    setDraft((d) => normalizeDraftTimedRange(d, { ...d, endAt: iso }, false, true));
                  }}
                  className="w-full flex-1 rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
                />
              </>
            )}
          </div>
        </div>

        {googleCalendarConnected && (draft.dueDate || draft.startAt || isEvent) ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.dialog.syncCalendarLabel}
            </p>
            {enabledGoogleCalendars.length ? (
              <select
                value={calendarSelectValue(draft.googleCalendarConnectionId, draft.googleCalendarId)}
                onChange={(e) => {
                const selected = parseCalendarSelectValue(e.target.value);
                setDraft((d) => ({
                  ...d,
                  googleCalendarConnectionId: selected.connectionId,
                  googleCalendarAccountId: enabledGoogleCalendars.find(
                    (calendar) => calendar.connectionId === selected.connectionId && calendar.id === selected.calendarId,
                  )?.googleAccountId ?? "",
                  googleCalendarId: selected.calendarId,
                }));
                }}
                className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
              >
                {!isEvent && <option value="">{t.dialog.localOnlyOption}</option>}
                {enabledGoogleCalendars.map((calendar) => (
                  <option key={`${calendar.connectionId}:${calendar.id}`} value={calendarSelectValue(calendar.connectionId, calendar.id)}>
                    {calendar.googleEmail} - {calendar.summary}
                  </option>
                ))}
              </select>
            ) : (
              <p className="rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink-faint">
                {t.dialog.noSyncedCalendars}
              </p>
            )}
          </div>
        ) : null}

        {/* Location. */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.dialog.locationLabel}
          </p>
          <input
            value={draft.location ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            placeholder={t.dialog.locationPlaceholder}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Description. */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.dialog.descriptionLabel}
          </p>
          <textarea
            rows={4}
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
            placeholder={t.dialog.descriptionPlaceholder}
            className="w-full resize-none rounded-[var(--radius-inner)] bg-surface-muted p-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Checklist. */}
        {!isEvent && (
          <div>
            <TaskChecklist
              items={draft.checklist ?? []}
              onChange={(checklist) => setDraft((d) => ({ ...d, checklist }))}
            />
          </div>
        )}

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving || (isEvent && (!draft.googleCalendarConnectionId || !draft.googleCalendarId))}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {saving ? t.dialog.saving : t.dialog.submit}
        </button>
      </div>
    </Modal>
  );
}

function calendarSelectValue(connectionId?: string, calendarId?: string) {
  if (!connectionId || !calendarId) return "";
  return `${encodeURIComponent(connectionId)}:${encodeURIComponent(calendarId)}`;
}

function parseCalendarSelectValue(value: string) {
  if (!value) return { connectionId: "", calendarId: "" };
  const [connectionId = "", calendarId = ""] = value.split(":");
  return {
    connectionId: decodeURIComponent(connectionId),
    calendarId: decodeURIComponent(calendarId),
  };
}

const MIN_EVENT_DURATION_MS = 30 * 60 * 1000;

function normalizeDraftTimedRange(
  previous: ItemDialogDraft,
  next: ItemDialogDraft,
  startChanged: boolean,
  endChanged: boolean,
): ItemDialogDraft {
  if (next.allDay || !next.startAt || !next.endAt) return next;
  const startMs = Date.parse(next.startAt);
  const endMs = Date.parse(next.endAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs > startMs) return next;

  const previousDuration = Math.max(
    MIN_EVENT_DURATION_MS,
    Date.parse(previous.endAt ?? "") - Date.parse(previous.startAt ?? "") || MIN_EVENT_DURATION_MS,
  );
  if (startChanged && !endChanged) {
    return { ...next, endAt: new Date(startMs + previousDuration).toISOString() };
  }
  if (endChanged && !startChanged) {
    return { ...next, startAt: new Date(endMs - previousDuration).toISOString() };
  }
  return { ...next, endAt: new Date(startMs + MIN_EVENT_DURATION_MS).toISOString() };
}
