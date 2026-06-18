import { useEffect, useState } from "react";
import { format } from "date-fns";
import { cn } from "../../lib/cn";
import { useConfirm } from "../../components/confirm-dialog";
import { IconButton } from "../../components/icon-button";
import { Modal } from "../../components/modal";
import { DatePicker } from "../../components/ui/date-picker";
import { TaskChecklist } from "./task-checklist";
import { STATUS_META, TASK_STATUSES, type Task } from "./task-types";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { GoogleCalendarEvent, GoogleCalendarEventPatch } from "../google-calendar/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type TaskDetailDialogProps = {
  task: Task | null;
  event: GoogleCalendarEvent | null;
  onClose: () => void;
  onPatchTask?: (patch: Partial<Task>) => void;
  onDeleteTask?: () => void;
  onPatchEvent?: (patch: GoogleCalendarEventPatch) => void;
  onDeleteEvent?: () => void;
  onConvertEvent?: (event: GoogleCalendarEvent) => void;
};

export function TaskDetailDialog({
  task,
  event,
  onClose,
  onPatchTask,
  onDeleteTask,
  onPatchEvent,
  onDeleteEvent,
  onConvertEvent,
}: TaskDetailDialogProps) {
  const confirm = useConfirm();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const locale = useLocale();
  const t = messages[locale].features.todo;

  const activeItem = task || event;
  const isEvent = !!event;

  useEffect(() => {
    if (activeItem) {
      setTitle(activeItem.title);
      setDesc(activeItem.description || "");
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [activeItem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeItem) {
    return <Modal open={false} title="" onClose={onClose} children={null} />;
  }

  function commitTitle() {
    const clean = title.trim();
    if (clean && clean !== activeItem!.title) {
      if (isEvent) onPatchEvent?.({ title: clean });
      else onPatchTask?.({ title: clean });
    } else {
      setTitle(activeItem!.title);
    }
    setEditingTitle(false);
  }

  function commitDesc() {
    if (desc !== (activeItem!.description || "")) {
      if (isEvent) onPatchEvent?.({ description: desc });
      else onPatchTask?.({ description: desc });
    }
    setEditingDesc(false);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t.detail.deleteTitle,
      message: t.detail.deleteMessage(activeItem!.title),
      confirmLabel: t.detail.deleteConfirm,
      danger: true,
    });
    if (ok) {
      if (isEvent) onDeleteEvent?.();
      else onDeleteTask?.();
      onClose();
    }
  }

  function patchDate(patch: { startAt?: string; endAt?: string; dueDate?: string; allDay?: boolean }) {
    if (isEvent) {
      const e = event!;
      const start = patch.startAt ?? e.start;
      const end = patch.endAt ?? e.end;
      const allDay = patch.allDay ?? e.allDay;
      onPatchEvent?.({
        start: allDay ? start.slice(0, 10) : start,
        end: allDay ? end.slice(0, 10) : end,
        allDay,
      });
    } else {
      onPatchTask?.(patch);
    }
  }

  function patchLocation(location: string) {
    if (isEvent) onPatchEvent?.({ location });
    else onPatchTask?.({ location });
  }

  // Status pills live in the modal header
  const statusPills = !isEvent && task ? (
    <div className="flex flex-wrap gap-1.5">
      {TASK_STATUSES.map((s) => {
        const active = task.status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onPatchTask?.({ status: s })}
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
  ) : (
    <div className="flex items-center">
      <span className="shrink-0 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
        Google Event
      </span>
    </div>
  );

  const headerActions = (
    <div className="flex items-center gap-2">
      {isEvent && onConvertEvent && (
        <button
          type="button"
          onClick={() => {
            onConvertEvent(event!);
            onClose();
          }}
          className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink-soft hover:bg-surface-hover hover:text-ink transition-colors"
        >
          {t.calendar.eventDetail.convertToTask}
        </button>
      )}
      <IconButton
        aria-label={t.detail.deleteTooltip}
        title={t.detail.deleteTooltip}
        onClick={handleDelete}
        className="bg-transparent text-ink-faint hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
      </IconButton>
    </div>
  );

  const currentStartAt = isEvent ? event!.start : task!.startAt ?? task!.dueDate;
  const currentEndAt = isEvent ? event!.end : task!.endAt ?? "";
  const currentAllDay = isEvent ? event!.allDay : task!.allDay ?? false;
  const currentLocation = isEvent ? event!.location : task!.location;
  const currentLink = isEvent ? event!.htmlLink : task!.googleEventLink;

  return (
    <Modal
      open
      title={statusPills}
      headerAction={headerActions}
      onClose={onClose}
    >
      <div className="space-y-5">
        {/* Title — click to edit inline. */}
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") {
                e.stopPropagation();
                setTitle(activeItem.title);
                setEditingTitle(false);
              }
            }}
            className="w-full rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2 text-lg font-semibold text-ink outline-none ring-2 ring-accent/40"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditingTitle(true)}
            className="-mx-2 block w-[calc(100%+1rem)] break-words rounded-[var(--radius-inner)] px-2 py-1 text-left text-lg font-semibold leading-snug text-ink transition-colors hover:bg-surface-sunken"
          >
            {activeItem.title}
          </button>
        )}

        {/* Date & Time */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.detail.dateTimeLabel}
            </p>
            <label className="flex items-center gap-2 text-sm text-ink-faint cursor-pointer">
              <input
                type="checkbox"
                checked={currentAllDay}
                onChange={(e) => patchDate({ allDay: e.target.checked })}
                className="rounded border-surface-muted accent-accent"
              />
              {t.detail.allDayLabel}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {currentAllDay ? (
              <>
                <DatePicker
                  value={currentStartAt}
                  onChange={(iso) => patchDate({ startAt: iso, dueDate: iso })}
                  placeholder={t.detail.startDatePlaceholder}
                />
                <DatePicker
                  value={currentEndAt}
                  onChange={(iso) => patchDate({ endAt: iso })}
                  placeholder={t.detail.endDatePlaceholder}
                />
              </>
            ) : (
              <>
                <input
                  type="datetime-local"
                  value={
                    currentStartAt && !isNaN(new Date(currentStartAt).getTime())
                      ? format(new Date(currentStartAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    patchDate({ startAt: iso, dueDate: iso ? iso.slice(0, 10) : "" });
                  }}
                  className="w-full flex-1 rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
                />
                <input
                  type="datetime-local"
                  value={
                    currentEndAt && !isNaN(new Date(currentEndAt).getTime())
                      ? format(new Date(currentEndAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    patchDate({ endAt: iso });
                  }}
                  className="w-full flex-1 rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
                />
              </>
            )}
          </div>
        </div>

        {/* Location. */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.detail.locationLabel}
          </p>
          <input
            value={currentLocation ?? ""}
            onChange={(e) => patchLocation(e.target.value)}
            placeholder={t.detail.locationPlaceholder}
            className="w-full rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
          />
        </div>

        {/* Description — click to edit inline. */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
            {t.detail.descriptionLabel}
          </p>
          {editingDesc ? (
            <textarea
              autoFocus
              rows={5}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              onBlur={commitDesc}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setDesc(activeItem.description || "");
                  setEditingDesc(false);
                }
              }}
              placeholder={t.detail.descriptionPlaceholder}
              className="w-full resize-none rounded-[var(--radius-inner)] bg-surface-sunken p-3 text-sm leading-relaxed text-ink outline-none ring-2 ring-accent/40 placeholder:text-ink-faint"
            />
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setEditingDesc(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setEditingDesc(true);
                }
              }}
              className={cn(
                "block max-h-[34vh] w-full overflow-y-auto break-words rounded-[var(--radius-inner)] bg-surface-sunken p-3 text-left text-sm leading-relaxed transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-accent/40",
                activeItem.description ? "prose prose-sm dark:prose-invert max-w-none text-ink" : "text-ink-faint",
              )}
            >
              {activeItem.description ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {activeItem.description}
                </ReactMarkdown>
              ) : (
                t.detail.descriptionPlaceholder
              )}
            </div>
          )}
        </div>

        {/* Checklist. */}
        {!isEvent && task && (
          <div>
            <TaskChecklist
              items={task.checklist ?? []}
              onChange={(checklist) => onPatchTask?.({ checklist })}
            />
          </div>
        )}

        {/* Advanced / Meta */}
        <details className="group rounded-[var(--radius-inner)] border border-surface-muted [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-faint outline-none transition-colors hover:text-ink">
            {t.detail.advancedLabel}
          </summary>
          <div className="border-t border-surface-muted px-3.5 py-3 text-sm text-ink-soft">
            <p className="mb-2">
              {t.detail.advancedDescription}
            </p>
            {currentLink ? (
              <a href={currentLink} target="_blank" rel="noreferrer" className="text-accent hover:underline font-medium">
                {t.detail.openGoogleCalendar}
              </a>
            ) : (
              <p className="text-ink-faint italic">{t.detail.syncToAccessAdvanced}</p>
            )}
          </div>
        </details>
      </div>
    </Modal>
  );
}
