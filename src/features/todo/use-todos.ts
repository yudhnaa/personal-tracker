import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiJson, ClientSessionChangedError } from "../../lib/api-client";
import { captureClientCacheScope, isClientCacheScopeCurrent } from "../../lib/client-cache";
import { createSerializedMutationQueue } from "../../lib/serialized-mutation";
import { useApiState } from "../../lib/use-api-state";
import { TASK_STATUSES, type Task, type TaskStatus } from "./task-types";
import { buildTaskPatch } from "./todo-mutation";

export type TaskDraft = Pick<
  Task,
  "title" | "description" | "dueDate" | "status" | "checklist" | "googleCalendarConnectionId" | "googleCalendarAccountId" | "googleCalendarId" | "googleEventId" | "googleEventLink" | "startAt" | "endAt" | "allDay" | "location"
> & Partial<Pick<Task, "source" | "syncStatus">>;

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
  const queryClient = useQueryClient();
  const [mutationQueue] = useState(() => {
    const scope = captureClientCacheScope();
    return createSerializedMutationQueue({
      isActive: () => Boolean(scope.subject && isClientCacheScopeCurrent(scope)),
      inactiveError: () => new ClientSessionChangedError(),
    });
  });
  const { data: tasks, setData: setRawTasks, commit, reload } = useApiState<Task[]>(
    "/api/v1/todos",
    [],
  );

  useEffect(() => {
    mutationQueue.activate();
    return () => mutationQueue.dispose();
  }, [mutationQueue]);

  // Every write runs through stampDone so doneAt stays correct no matter which
  // path changed the status (dialog edit, status pill, or drag to the column).
  function setTasks(updater: Task[] | ((prev: Task[]) => Task[])) {
    const apply = (prev: Task[]) =>
      stampDone(typeof updater === "function" ? updater(prev) : updater);
    setRawTasks((prev) => {
      const next = apply(prev);
      void mutationQueue.enqueue(() => commit(
          apiJson<Task[]>("/api/v1/todos", {
            method: "PUT",
            body: JSON.stringify(next),
          }),
          async () => {
            await reload();
          },
        )).catch(() => undefined);
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
    const created = await mutationQueue.enqueue(() => commit(
        apiJson<Task>("/api/v1/todos", {
          method: "POST",
          body: JSON.stringify(draft),
        }),
      )).catch(() => undefined);
    if (created) {
      setRawTasks((prev) => {
        const exists = prev.some((task) => task.id === created.id);
        return stampDone(exists ? prev.map((task) => (task.id === created.id ? created : task)) : [created, ...prev]);
      });
      removeLinkedGoogleEventFromCache(queryClient, created);
    }
    return created ?? null;
  }

  function updateTask(id: string, draft: TaskDraft) {
    patchTask(id, draft);
  }

  /** Inline auto-save: merge a partial patch into one task. */
  function patchTask(id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) {
    const currentTasks = queryClient.getQueryData<Task[]>(["/api/v1/todos"]) ?? tasks;
    const target = currentTasks.find((task) => task.id === id);
    if (!target) return;
    const desiredTask = stampDone([{ ...target, ...patch }])[0];

    setRawTasks((current) =>
      current.map((task) => (task.id === id ? desiredTask : task)),
    );

    const payload = buildTaskPatch(desiredTask);

    void mutationQueue.enqueue(() => commit(
        apiJson<Task[]>(`/api/v1/todos/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        }),
        async () => {
          await reload();
        },
      )).catch(() => undefined);
  }

  function moveTask(id: string, status: TaskStatus) {
    patchTask(id, { status });
  }

  /** Replace the whole task list — used by drag-sort to persist new order/status. */
  function reorderTasks(next: Task[]) {
    setTasks(next);
  }

  function removeTask(id: string) {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (taskToDelete) removeLinkedGoogleEventFromCache(queryClient, taskToDelete);
    setRawTasks((prev) => prev.filter((t) => t.id !== id));
    void mutationQueue.enqueue(() => commit(
        apiJson<Task[]>(`/api/v1/todos/${id}`, { method: "DELETE" }),
        async () => {
          await reload();
        },
      )).catch(() => undefined);
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

function removeLinkedGoogleEventFromCache(queryClient: ReturnType<typeof useQueryClient>, task: Task) {
  if (!task.googleCalendarAccountId || !task.googleCalendarId || !task.googleEventId) return;
  const calendarIds = new Set([task.googleCalendarId]);
  if (task.googleCalendarId.includes("@")) calendarIds.add("primary");
  queryClient.setQueriesData<{ id: string; googleAccountId?: string; calendarId?: string }[]>(
    { queryKey: ["/api/v1/google-calendar/events"] },
    (old) => (old ? old.filter((event) =>
      event.id !== task.googleEventId ||
      event.googleAccountId !== task.googleCalendarAccountId ||
      !calendarIds.has(event.calendarId ?? "")
    ) : old),
  );
}
