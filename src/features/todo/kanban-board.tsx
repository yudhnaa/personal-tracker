import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, ListChecks, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { dueState, formatShortDate } from "../../lib/date";
import {
  STATUS_META,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "./task-types";
import { isArchivedDone } from "./use-todos";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type KanbanBoardProps = {
  byStatus: Record<TaskStatus, Task[]>;
  onReorder: (tasks: Task[]) => void;
  onOpen: (task: Task) => void;
  /** Create a new task pre-set to a column's status (Trello-style add). */
  onAddTask: (status: TaskStatus) => void;
  /** Auto-hide done tasks older than this many days (0 = never). */
  archiveDays: number;
};

type Columns = Record<TaskStatus, string[]>;

const columnsFromStatus = (byStatus: Record<TaskStatus, Task[]>): Columns =>
  Object.fromEntries(
    TASK_STATUSES.map((s) => [s, byStatus[s].map((t) => t.id)]),
  ) as Columns;

/**
 * Four-column board with full sortable drag-and-drop (dnd-kit): cards reorder
 * within a column and move across columns, with siblings shifting to open a
 * gap as you drag. Live order is local state during a drag, then persisted.
 */
export function KanbanBoard({
  byStatus,
  onReorder,
  onOpen,
  onAddTask,
  archiveDays,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Columns>(() =>
    columnsFromStatus(byStatus),
  );

  const taskMap = useMemo(() => {
    const m = new Map<string, Task>();
    for (const s of TASK_STATUSES) for (const t of byStatus[s]) m.set(t.id, t);
    return m;
  }, [byStatus]);

  // Re-sync from props when not mid-drag (e.g. add/edit/delete elsewhere).
  useEffect(() => {
    if (!activeId) setColumns(columnsFromStatus(byStatus));
  }, [byStatus, activeId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 140, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  /** Which column an id belongs to (a card id, or a column id itself). */
  function findColumn(id: string): TaskStatus | null {
    if ((TASK_STATUSES as readonly string[]).includes(id)) {
      return id as TaskStatus;
    }
    return TASK_STATUSES.find((s) => columns[s].includes(id)) ?? null;
  }

  /** Flatten columns into an ordered task list with each card's new status. */
  function persist(next: Columns) {
    const flat: Task[] = [];
    for (const status of TASK_STATUSES) {
      for (const id of next[status]) {
        const t = taskMap.get(id);
        if (t) flat.push(t.status === status ? t : { ...t, status });
      }
    }
    onReorder(flat);
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  // Move the dragged card into the hovered column live, so siblings shift.
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findColumn(active.id as string);
    const to = findColumn(over.id as string);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const overItems = prev[to];
      const overIndex = overItems.indexOf(over.id as string);
      const insertAt = overIndex >= 0 ? overIndex : overItems.length;
      return {
        ...prev,
        [from]: prev[from].filter((id) => id !== active.id),
        [to]: [
          ...overItems.slice(0, insertAt),
          active.id as string,
          ...overItems.slice(insertAt),
        ],
      };
    });
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const from = findColumn(active.id as string);
    const to = findColumn(over.id as string);
    if (!from || !to) return;

    let next = columns;
    if (from === to) {
      const items = columns[from];
      const oldIndex = items.indexOf(active.id as string);
      const newIndex = items.indexOf(over.id as string);
      if (newIndex !== -1 && oldIndex !== newIndex) {
        next = { ...columns, [from]: arrayMove(items, oldIndex, newIndex) };
        setColumns(next);
      }
    }
    persist(next);
  }

  const activeTask = activeId ? taskMap.get(activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-4 sm:overflow-x-visible sm:pb-0">
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            ids={columns[status]}
            taskMap={taskMap}
            onOpen={onOpen}
            onAddTask={onAddTask}
            archiveDays={archiveDays}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? <TaskCardBody task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

type ColumnProps = {
  status: TaskStatus;
  ids: string[];
  taskMap: Map<string, Task>;
  onOpen: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  archiveDays: number;
};

function Column({
  status,
  ids,
  taskMap,
  onOpen,
  onAddTask,
  archiveDays,
}: ColumnProps) {
  const meta = STATUS_META[status];
  // The column id doubles as a droppable so empty columns still accept drops.
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [showArchived, setShowArchived] = useState(false);
  const locale = useLocale();
  const t = messages[locale].features.todo;

  // In Done, fold away tasks completed long ago so the board stays light.
  // They stay in storage and on the board model — just hidden until revealed.
  const archivedIds =
    status === "done"
      ? ids.filter((id) => {
          const t = taskMap.get(id);
          return t ? isArchivedDone(t, archiveDays) : false;
        })
      : [];
  const visibleIds =
    archivedIds.length && !showArchived
      ? ids.filter((id) => !archivedIds.includes(id))
      : ids;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 w-[160px] shrink-0 flex-col rounded-[var(--radius-inner)] bg-surface-muted p-2 transition-colors sm:w-auto",
        isOver && "bg-accent-soft/60",
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-1.5 pt-1">
        <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
        <span className="text-xs font-semibold text-ink">{t.columns[status]}</span>
        <span className="ml-auto text-xs font-medium text-ink-faint">
          {ids.length - archivedIds.length}
        </span>
      </div>
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
          {visibleIds.map((id) => {
            const task = taskMap.get(id);
            return task ? (
              <SortableTaskCard
                key={id}
                task={task}
                onClick={() => onOpen(task)}
              />
            ) : null;
          })}
        </div>
      </SortableContext>
      {archivedIds.length ? (
        <button
          type="button"
          onClick={() => setShowArchived((s) => !s)}
          className="mt-1.5 shrink-0 rounded-[0.6rem] px-1.5 py-1 text-left text-[11px] font-medium text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-soft"
        >
          {showArchived
            ? t.archiveHide
            : t.archiveShow(archivedIds.length, archiveDays)}
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onAddTask(status)}
        className="mt-1.5 flex w-full shrink-0 items-center gap-1.5 rounded-[0.85rem] px-2 py-2 text-left text-[13px] font-medium text-ink-faint transition-colors hover:bg-surface-hover hover:text-ink-soft"
      >
        <Plus size={15} className="shrink-0" />
        {t.addTask}
      </button>
    </div>
  );
}

function SortableTaskCard({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={cn(
        "w-full cursor-grab rounded-[0.85rem] bg-surface p-3 text-left",
        "ring-1 ring-inset ring-transparent hover:ring-line active:cursor-grabbing",
        // The lifted copy lives in the DragOverlay; leave a faint gap here.
        isDragging && "opacity-40",
      )}
    >
      <TaskCardBody task={task} />
    </button>
  );
}

/** Visual content of a task card, shared by the column items and drag overlay. */
function TaskCardBody({ task, overlay }: { task: Task; overlay?: boolean }) {
  const due = dueState(task.dueDate);
  const checklistTotal = task.checklist?.length ?? 0;
  const checklistDone = task.checklist?.filter((c) => c.done).length ?? 0;
  const content = (
    <>
      <p className="line-clamp-2 text-[13px] font-medium leading-snug text-ink">
        {task.title}
      </p>
      {/* Done cards stay minimal — description and deadline add no value there. */}
      {task.description && task.status !== "done" ? (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-ink-faint">
          {task.description}
        </p>
      ) : null}
      {/* Done cards stay minimal — these meta chips add no value there. */}
      {task.status !== "done" && (task.dueDate || checklistTotal > 0) ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                due === "overdue" && "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
                due === "today" && "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                due === "upcoming" && "bg-surface-muted text-ink-soft",
              )}
            >
              <CalendarClock size={12} />
              {formatShortDate(task.dueDate)}
            </span>
          ) : null}
          {checklistTotal > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                checklistDone === checklistTotal
                  ? "bg-accent-soft text-accent-ink"
                  : "bg-surface-muted text-ink-soft",
              )}
            >
              <ListChecks size={12} />
              {checklistDone}/{checklistTotal}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (overlay) {
    return (
      <div className="w-[160px] cursor-grabbing rounded-[0.85rem] bg-surface p-3 text-left sm:w-56">
        {content}
      </div>
    );
  }
  return content;
}
