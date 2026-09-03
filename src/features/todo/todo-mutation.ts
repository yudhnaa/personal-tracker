import type { Task } from "./task-types";

/** Build a complete mutable snapshot so a later queued patch preserves every
 * optimistic field even if an earlier request needed server reconciliation. */
export function buildTaskPatch(task: Task): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...task,
    doneAt: task.doneAt ?? null,
  };
  delete payload.id;
  delete payload.createdAt;
  return payload;
}
