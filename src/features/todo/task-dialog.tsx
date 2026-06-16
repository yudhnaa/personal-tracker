import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { cn } from "../../lib/cn";
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
  onSubmit: (draft: ItemDialogDraft) => void | Promise<void>;
};

const EMPTY: ItemDialogDraft = {
  type: "task",
  title: "",
  description: "",
  dueDate: "",
  status: "todo",
  checklist: [],
  googleCalendarId: "",
  startAt: "",
  endAt: "",
  allDay: false,
  location: "",
};

export function TaskDialog({
  open,
  task,
  defaultType = "task",
  googleCalendarConnected = false,
  googleCalendars = [],
  onClose,
  onSubmit,
}: ItemDialogProps) {
  const [draft, setDraft] = useState<ItemDialogDraft>(EMPTY);
  const locale = useLocale();
  const t = messages[locale].features.todo;
  const enabledGoogleCalendars = useMemo(
    () => (googleCalendarConnected ? googleCalendars.filter((calendar) => calendar.selected) : []),
    [googleCalendarConnected, googleCalendars],
  );

  useEffect(() => {
    if (!open) return;
    const firstCalendarId = enabledGoogleCalendars[0]?.id ?? "";
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    setDraft(
      task && task.id
        ? {
            type: defaultType,
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            status: task.status,
            checklist: task.checklist ?? [],
            googleCalendarId: task.googleCalendarId || (task.dueDate ? firstCalendarId : ""),
            startAt: task.startAt ?? "",
            endAt: task.endAt ?? "",
            allDay: task.allDay ?? false,
            location: task.location ?? "",
          }
        : {
            ...EMPTY,
            type: defaultType,
            googleCalendarId: "",
            startAt: now.toISOString(),
            endAt: oneHourLater.toISOString(),
            dueDate: task?.dueDate || format(now, "yyyy-MM-dd"),
            status: task?.status || "todo",
          },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task?.id, defaultType]);

  function submit() {
    if (!draft.title.trim()) return;
    if (draft.type === "event" && !draft.googleCalendarId) return; // Events require a calendar
    if (draft.type === "event" && (!draft.startAt || !draft.endAt)) {
      alert("Start and End times are required for events.");
      return;
    }
    void onSubmit({
      ...draft,
      title: draft.title.trim(),
      googleCalendarId: (draft.startAt || draft.dueDate || draft.type === "event") ? draft.googleCalendarId : undefined,
    });
    onClose();
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
        Task
      </button>
      {googleCalendarConnected && (
        <button
          type="button"
          onClick={() => setDraft((d) => ({ ...d, type: "event", googleCalendarId: d.googleCalendarId || enabledGoogleCalendars[0]?.id || "" }))}
          className={cn(
            "flex-1 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
            isEvent ? "bg-surface text-ink shadow-sm" : "text-ink-soft hover:text-ink"
          )}
        >
          Event
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
            {STATUS_META[s].label}
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
              if (e.key === "Enter") submit();
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
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    setDraft((d) => ({
                      ...d,
                      startAt: iso,
                      dueDate: iso ? iso.slice(0, 10) : "",
                      googleCalendarId: iso ? d.googleCalendarId || enabledGoogleCalendars[0]?.id || "" : "",
                    }));
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
                    setDraft((d) => ({ ...d, endAt: iso }));
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
                value={draft.googleCalendarId ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, googleCalendarId: e.target.value }))}
                className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
              >
                {!isEvent && <option value="">{t.dialog.localOnlyOption}</option>}
                {enabledGoogleCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
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

        <button
          type="button"
          onClick={submit}
          disabled={isEvent && !draft.googleCalendarId}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {t.dialog.submit}
        </button>
      </div>
    </Modal>
  );
}
