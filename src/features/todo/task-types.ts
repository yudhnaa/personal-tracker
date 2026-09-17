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
  googleCalendarConnectionId?: string;
  googleCalendarAccountId?: string;
  googleCalendarId?: string;
  googleEventId?: string;
  googleEventLink?: string;
  googleEventPayload?: Record<string, unknown>;
};

export const STATUS_META: Record<
  TaskStatus,
  { dot: string; chip: string }
> = {
  backlog: { dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
  todo: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700 border border-sky-100" },
  doing: { dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700 border border-amber-100" },
  done: { dot: "bg-emerald-600", chip: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
};
