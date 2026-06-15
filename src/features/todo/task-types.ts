/** Workflow columns for the kanban board, in display order. */
export const TASK_STATUSES = ["backlog", "todo", "doing", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** A single "việc cần làm" line inside a task. */
export type ChecklistItem = { id: string; text: string; done: boolean };

export type TaskSource = "local" | "google";
export type TaskSyncStatus = "local_only" | "synced" | "pending_sync" | "error";

export type Task = {
  id: string;
  title: string;
  description: string;
  /** ISO date string (yyyy-mm-dd) or empty when no due date. */
  dueDate: string;
  status: TaskStatus;
  createdAt: number;
  /** Epoch ms when the task entered "done"; used to fold away old done tasks. */
  doneAt?: number;
  /** Optional checklist of subtasks. */
  checklist?: ChecklistItem[];
  source: TaskSource;
  syncStatus: TaskSyncStatus;
  startAt?: string;
  endAt?: string;
  allDay?: boolean;
  location?: string;
  googleCalendarId?: string;
  googleEventId?: string;
  googleEventLink?: string;
  googleEventPayload?: Record<string, any>;
};

export const STATUS_META: Record<
  TaskStatus,
  { label: string; dot: string; chip: string }
> = {
  backlog: { label: "Backlog", dot: "bg-zinc-400", chip: "bg-surface-muted text-ink-soft" },
  todo: { label: "Todo", dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" },
  doing: { label: "Doing", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  done: { label: "Done", dot: "bg-accent", chip: "bg-accent-soft text-accent-ink" },
};
