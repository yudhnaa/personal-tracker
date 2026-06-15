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

type TaskDetailDialogProps = {
  task: Task | null;
  onClose: () => void;
  onPatch: (patch: Partial<Task>) => void;
  onDelete: () => void;
};

/**
 * Trello-style "card back": each field edits inline and saves immediately.
 * A pinned header (status, title, due date) sits above a two-column body —
 * Description and Checklist scroll independently so neither can blow up the
 * dialog height. Delete hides behind a quiet header icon with a confirm.
 */
export function TaskDetailDialog({
  task,
  onClose,
  onPatch,
  onDelete,
}: TaskDetailDialogProps) {
  const confirm = useConfirm();
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const locale = useLocale();
  const t = messages[locale].features.todo;

  // Re-seed local buffers whenever a different task opens.
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDesc(task.description);
      setEditingTitle(false);
      setEditingDesc(false);
    }
  }, [task?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!task) {
    return <Modal open={false} title="" onClose={onClose} children={null} />;
  }

  function commitTitle() {
    const clean = title.trim();
    if (clean && clean !== task!.title) onPatch({ title: clean });
    else setTitle(task!.title);
    setEditingTitle(false);
  }

  function commitDesc() {
    if (desc !== task!.description) onPatch({ description: desc });
    setEditingDesc(false);
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t.detail.deleteTitle,
      message: t.detail.deleteMessage(task!.title),
      confirmLabel: t.detail.deleteConfirm,
      danger: true,
    });
    if (ok) {
      onDelete();
      onClose();
    }
  }

  // Status pills live in the modal header (replacing a redundant "Chi tiết" title).
  const statusPills = (
    <div className="flex flex-wrap gap-1.5">
      {TASK_STATUSES.map((s) => {
        const active = task.status === s;
        return (
          <button
            key={s}
            type="button"
            onClick={() => onPatch({ status: s })}
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

  const deleteAction = (
    <IconButton
      aria-label={t.detail.deleteTooltip}
      title={t.detail.deleteTooltip}
      onClick={handleDelete}
      className="bg-transparent text-ink-faint hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
    </IconButton>
  );

  return (
    <Modal
      open
      wide
      title={statusPills}
      headerAction={deleteAction}
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
                // Exit the inline edit only — don't let Modal catch Esc + close.
                e.stopPropagation();
                setTitle(task.title);
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
            {task.title}
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
                checked={task.allDay}
                onChange={(e) => onPatch({ allDay: e.target.checked })}
                className="rounded border-surface-muted accent-accent"
              />
              {t.detail.allDayLabel}
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            {task.allDay ? (
              <>
                <DatePicker
                  value={task.startAt ?? task.dueDate}
                  onChange={(iso) => onPatch({ startAt: iso, dueDate: iso })}
                  placeholder={t.detail.startDatePlaceholder}
                />
                <DatePicker
                  value={task.endAt ?? ""}
                  onChange={(iso) => onPatch({ endAt: iso })}
                  placeholder={t.detail.endDatePlaceholder}
                />
              </>
            ) : (
              <>
                <input
                  type="datetime-local"
                  value={
                    task.startAt && !isNaN(new Date(task.startAt).getTime())
                      ? format(new Date(task.startAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    onPatch({ startAt: iso, dueDate: iso ? iso.slice(0, 10) : "" });
                  }}
                  className="w-full flex-1 rounded-[var(--radius-inner)] bg-surface-muted px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:bg-surface-sunken focus:ring-2 focus:ring-accent/40"
                />
                <input
                  type="datetime-local"
                  value={
                    task.endAt && !isNaN(new Date(task.endAt).getTime())
                      ? format(new Date(task.endAt), "yyyy-MM-dd'T'HH:mm")
                      : ""
                  }
                  onChange={(e) => {
                    const iso = e.target.value ? new Date(e.target.value).toISOString() : "";
                    onPatch({ endAt: iso });
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
            value={task.location ?? ""}
            onChange={(e) => onPatch({ location: e.target.value })}
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
                  setDesc(task.description);
                  setEditingDesc(false);
                }
              }}
              placeholder={t.detail.descriptionPlaceholder}
              className="w-full resize-none rounded-[var(--radius-inner)] bg-surface-sunken p-3 text-sm leading-relaxed text-ink outline-none ring-2 ring-accent/40 placeholder:text-ink-faint"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDesc(true)}
              className={cn(
                "block max-h-[34vh] w-full overflow-y-auto whitespace-pre-wrap break-words rounded-[var(--radius-inner)] bg-surface-sunken p-3 text-left text-sm leading-relaxed transition-colors hover:bg-surface-muted",
                task.description ? "text-ink" : "text-ink-faint",
              )}
            >
              {task.description || t.detail.descriptionPlaceholder}
            </button>
          )}
        </div>

        {/* Checklist. */}
        <div>
          <TaskChecklist
            items={task.checklist ?? []}
            onChange={(checklist) => onPatch({ checklist })}
          />
        </div>

        {/* Advanced / Meta */}
        <details className="group rounded-[var(--radius-inner)] border border-surface-muted [&_summary::-webkit-details-marker]:hidden">
          <summary className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-ink-faint outline-none transition-colors hover:text-ink">
            {t.detail.advancedLabel}
          </summary>
          <div className="border-t border-surface-muted px-3.5 py-3 text-sm text-ink-soft">
            <p className="mb-2">
              {t.detail.advancedDescription}
            </p>
            {task?.googleEventLink ? (
              <a href={task.googleEventLink} target="_blank" rel="noreferrer" className="text-accent hover:underline font-medium">
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
