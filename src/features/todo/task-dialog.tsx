import { useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "../../lib/cn";
import { toIsoDate } from "../../lib/date";
import { Modal } from "../../components/modal";
import { DatePicker } from "../../components/ui/date-picker";
import { TaskChecklist } from "./task-checklist";
import { TASK_STATUSES, type Task } from "./task-types";
import type { TaskDraft } from "./use-todos";
import { ChevronDown } from "lucide-react";
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
    ? `open:${props.task?.id ?? "new"}:${props.task?.dueDate ?? ""}:${props.defaultType ?? "task"}`
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
    let startDate = now;
    if (task?.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
      const parsed = new Date(`${task.dueDate}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:00`);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
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
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        dueDate: task?.dueDate || format(startDate, "yyyy-MM-dd"),
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
    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-full w-full border border-slate-200/60 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setDraft((d) => ({ ...d, type: "task" }))}
        className={cn(
          "flex-1 py-1 px-4 rounded-full text-xs font-semibold transition-all text-center",
          !isEvent
            ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200/60 dark:border-slate-800"
            : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
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
            "flex-1 py-1 px-4 rounded-full text-xs font-medium transition-all text-center",
            isEvent
              ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-semibold shadow-sm border border-slate-200/60 dark:border-slate-800"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          {t.dialog.eventType}
        </button>
      )}
    </div>
  );

  const statusPills = (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      {TASK_STATUSES.map((s) => {
        const active = draft.status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => setDraft((d) => ({ ...d, status: s }))}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer",
              active
                ? s === "backlog"
                  ? "bg-slate-700 text-white shadow-xs"
                  : s === "todo"
                    ? "bg-rose-600 text-white shadow-xs"
                    : s === "doing"
                      ? "bg-amber-500 text-white shadow-xs"
                      : "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60",
            )}
          >
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                active
                  ? "bg-white"
                  : s === "backlog"
                    ? "bg-slate-400"
                    : s === "todo"
                      ? "bg-rose-500"
                      : s === "doing"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
              )}
            />
            <span>{t.columns[s]}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <Modal open={open} title={typeToggle} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!isEvent && statusPills}

        {/* Title */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t.dialog.titleLabel}
          </label>
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder={isEvent ? t.calendar.eventDialog.titlePlaceholder : t.dialog.titlePlaceholder}
            className="w-full h-11 px-3.5 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Date & Time */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {t.dialog.dateTimeLabel}
            </span>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-normal text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 select-none">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) => setDraft((d) => ({ ...d, allDay: e.target.checked }))}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>{t.dialog.allDayLabel}</span>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  className="w-full h-11 px-3.5 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
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
                  className="w-full h-11 px-3.5 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 tabular-nums focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
                />
              </>
            )}
          </div>
        </div>

        {/* Google Calendar */}
        {googleCalendarConnected && (draft.dueDate || draft.startAt || isEvent) ? (
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
              {t.dialog.syncCalendarLabel}
            </label>
            {enabledGoogleCalendars.length ? (
              <div className="relative">
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
                  className="w-full h-11 pl-3.5 pr-10 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors appearance-none cursor-pointer"
                >
                  {!isEvent && <option value="">{t.dialog.localOnlyOption}</option>}
                  {enabledGoogleCalendars.map((calendar) => (
                    <option key={`${calendar.connectionId}:${calendar.id}`} value={calendarSelectValue(calendar.connectionId, calendar.id)}>
                      {calendar.googleEmail} - {calendar.summary}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={16} />
                </div>
              </div>
            ) : (
              <p className="rounded-lg bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 px-3.5 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                {t.dialog.noSyncedCalendars}
              </p>
            )}
          </div>
        ) : null}

        {/* Location */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t.dialog.locationLabel}
          </label>
          <input
            value={draft.location ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
            placeholder={t.dialog.locationPlaceholder}
            className="w-full h-11 px-3.5 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
            {t.dialog.descriptionLabel}
          </label>
          <textarea
            rows={3}
            value={draft.description}
            onChange={(e) =>
              setDraft((d) => ({ ...d, description: e.target.value }))
            }
            placeholder={t.dialog.descriptionPlaceholder}
            className="w-full p-3 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors resize-none"
          />
        </div>

        {/* Subtasks (Only in Task mode) */}
        {!isEvent && (
          <div className="pt-0.5">
            <TaskChecklist
              items={draft.checklist ?? []}
              onChange={(checklist) => setDraft((d) => ({ ...d, checklist }))}
            />
          </div>
        )}

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || (isEvent && (!draft.googleCalendarConnectionId || !draft.googleCalendarId))}
            className="w-full h-11 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white active:scale-[0.99] text-white dark:text-slate-900 rounded-lg text-sm font-medium tracking-normal transition shadow-sm flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            {saving ? t.dialog.saving : isEvent ? t.dialog.submitEvent : t.dialog.submit}
          </button>
        </div>
      </form>
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
