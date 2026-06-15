import { useMemo } from "react";
import { apiJson } from "../../lib/api-client";
import { useApiState } from "../../lib/use-api-state";
import { TASK_STATUSES, type Task, type TaskStatus } from "./task-types";

export type TaskDraft = Pick<
  Task,
  "title" | "description" | "dueDate" | "status" | "checklist" | "googleCalendarId" | "googleEventId" | "googleEventLink" | "startAt" | "endAt" | "allDay" | "location"
>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A done task completed more than `days` ago — folded away on the board to
 * reduce clutter. `days <= 0` disables hiding entirely.
 */
export function isArchivedDone(t: Task, days: number): boolean {
  if (days <= 0) return false;
  return (
    t.status === "done" && t.doneAt != null && Date.now() - t.doneAt > days * DAY_MS
  );
}

/** Stamp doneAt when a task enters "done"; clear it when it leaves. */
function stampDone(tasks: Task[]): Task[] {
  const now = Date.now();
  return tasks.map((t) => {
    if (t.status === "done") return t.doneAt != null ? t : { ...t, doneAt: now };
    return t.doneAt != null ? { ...t, doneAt: undefined } : t;
  });
}

/** Source of truth for tasks with grouping + CRUD + status moves. */
export function useTodos() {
  const { data: tasks, setData: setRawTasks, commit, reload } = useApiState<Task[]>(
    "/api/todos",
    [],
  );

  // Every write runs through stampDone so doneAt stays correct no matter which
  // path changed the status (dialog edit, status pill, or drag to the column).
  function setTasks(updater: Task[] | ((prev: Task[]) => Task[])) {
    const apply = (prev: Task[]) =>
      stampDone(typeof updater === "function" ? updater(prev) : updater);
    setRawTasks((prev) => {
      const next = apply(prev);
      void commit(
        apiJson<Task[]>("/api/todos", {
          method: "PUT",
          body: JSON.stringify(next),
        }),
        async () => {
          await reload();
          return prev;
        },
      );
      return next;
    });
  }

  const byStatus = useMemo(() => {
    const groups = Object.fromEntries(
      TASK_STATUSES.map((s) => [s, [] as Task[]]),
    ) as Record<TaskStatus, Task[]>;
    for (const task of tasks) groups[task.status].push(task);
    return groups;
  }, [tasks]);

  async function addTask(draft: TaskDraft) {
    const created = await commit(
      apiJson<Task>("/api/todos", {
        method: "POST",
        body: JSON.stringify(draft),
      }),
      () => tasks,
    );
    if (created) setRawTasks((prev) => stampDone([created, ...prev]));
    return created ?? null;
  }

  function updateTask(id: string, draft: TaskDraft) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...draft } : t)),
    );
  }

  /** Inline auto-save: merge a partial patch into one task. */
  function patchTask(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    );
  }

  function moveTask(id: string, status: TaskStatus) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  }

  /** Replace the whole task list — used by drag-sort to persist new order/status. */
  function reorderTasks(next: Task[]) {
    setTasks(next);
  }

  function removeTask(id: string) {
    setRawTasks((prev) => prev.filter((t) => t.id !== id));
    void commit(apiJson<Task[]>(`/api/todos/${id}`, { method: "DELETE" }), async () => {
      await reload();
      return tasks;
    });
  }

  return {
    tasks,
    byStatus,
    addTask,
    updateTask,
    patchTask,
    moveTask,
    reorderTasks,
    removeTask,
  };
}
