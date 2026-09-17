import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
import { CalendarClock, Check, ListChecks, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import { dueState, formatShortDate } from "../../lib/date";
import {
  STATUS_META,
  TASK_STATUSES,
  type Task,
  type TaskStatus,
} from "./task-types";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type KanbanBoardProps = {
  byStatus: Record<TaskStatus, Task[]>;
  onReorder: (tasks: Task[]) => void;
  onOpen: (task: Task) => void;
  /** Create a new task pre-set to a column's status (Trello-style add). */
  onAddTask: (status: TaskStatus) => void;
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

  const visibleColumns = activeId ? columns : columnsFromStatus(byStatus);

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
    setColumns(columnsFromStatus(byStatus));
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
            ids={visibleColumns[status]}
            taskMap={taskMap}
            onOpen={onOpen}
            onAddTask={onAddTask}
          />
        ))}
      </div>
      {typeof document !== "undefined"
        ? createPortal(
            <DragOverlay dropAnimation={{ duration: 180 }}>
              {activeTask ? <TaskCardBody task={activeTask} overlay /> : null}
            </DragOverlay>,
            document.body,
          )
        : null}
    </DndContext>
  );
}

type ColumnProps = {
  status: TaskStatus;
  ids: string[];
  taskMap: Map<string, Task>;
  onOpen: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
};

function Column({
  status,
  ids,
  taskMap,
  onOpen,
  onAddTask,
}: ColumnProps) {
  const meta = STATUS_META[status];
  // The column id doubles as a droppable so empty columns still accept drops.
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const locale = useLocale();
  const t = messages[locale].features.todo;
  const isDone = status === "done";

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-0 w-[240px] shrink-0 flex-col justify-between rounded-md bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800 p-2.5 transition-colors sm:w-auto",
        isOver && "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-600",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-2 flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800 px-1 pb-2">
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t.columns[status]}</span>
          </div>
          <span
            className={cn(
              "text-[11px] font-mono font-medium px-1.5 py-0.5 rounded border",
              isDone
                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/60 dark:border-emerald-800"
                : "text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border-slate-200/60 dark:border-slate-700"
            )}
          >
            {ids.length}
          </span>
        </div>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="flex min-h-[220px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5 custom-scrollbar">
            {ids.map((id) => {
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
      </div>
      <button
        type="button"
        onClick={() => onAddTask(status)}
        className="mt-2 flex w-full shrink-0 items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 dark:border-slate-700 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 transition-colors hover:border-slate-400 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200"
      >
        <Plus size={14} className="shrink-0" />
        <span>{t.addTask}</span>
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
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={task.title}
      className={cn(
        "group w-full cursor-grab rounded-md bg-white dark:bg-slate-800 p-3 text-left border border-slate-200 dark:border-slate-700 shadow-2xs transition-all",
        "hover:border-slate-300 dark:hover:border-slate-600 hover:ring-1 hover:ring-slate-200 dark:hover:ring-slate-700 active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <TaskCardBody task={task} />
    </div>
  );
}

/** Visual content of a task card, shared by the column items and drag overlay. */
function TaskCardBody({ task, overlay }: { task: Task; overlay?: boolean }) {
  const isDone = task.status === "done";
  const due = dueState(task.dueDate);
  const checklistTotal = task.checklist?.length ?? 0;
  const checklistDone = task.checklist?.filter((c) => c.done).length ?? 0;
  const content = (
    <>
      <div className="flex items-start justify-between gap-1">
        <p
          className={cn(
            "text-xs font-semibold leading-snug",
            isDone
              ? "text-slate-400 dark:text-slate-500 line-through group-hover:text-slate-500 dark:group-hover:text-slate-400"
              : "text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white"
          )}
        >
          {task.title}
        </p>
        {isDone && (
          <span className="text-emerald-600 dark:text-emerald-400 opacity-80 group-hover:opacity-100 shrink-0">
            <Check size={14} strokeWidth={2.5} />
          </span>
        )}
      </div>
      {task.description && !isDone ? (
        <p className="mt-1 line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {task.description}
        </p>
      ) : null}
      {!isDone && (task.dueDate || checklistTotal > 0) ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {task.dueDate ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                due === "overdue" && "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50",
                due === "today" && "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50",
                due === "upcoming" && "bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-700",
              )}
            >
              <CalendarClock size={11} />
              {formatShortDate(task.dueDate)}
            </span>
          ) : null}
          {checklistTotal > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium font-mono tabular-nums border",
                checklistDone === checklistTotal
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-600 border-slate-200/60 dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-700",
              )}
            >
              <ListChecks size={11} />
              {checklistDone}/{checklistTotal}
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (overlay) {
    return (
      <div className="w-[200px] cursor-grabbing rounded-md bg-white dark:bg-slate-800 p-3 text-left border border-slate-300 dark:border-slate-600 shadow-md">
        {content}
      </div>
    );
  }
  return content;
}
