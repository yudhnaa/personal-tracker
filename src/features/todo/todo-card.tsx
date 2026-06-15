import { Calendar, KanbanSquare, ListChecks, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { cn } from "../../lib/cn";
import { toIsoDate } from "../../lib/date";
import { useLocalStorage } from "../../lib/use-local-storage";
import { CalendarView } from "./calendar-view";
import { KanbanBoard } from "./kanban-board";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskDialog, type TaskDialogDraft } from "./task-dialog";
import type { Task, TaskStatus } from "./task-types";
import { useTodos } from "./use-todos";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { UseGoogleCalendarResult } from "../google-calendar/use-google-calendar";
import type { GoogleCalendarEvent } from "../google-calendar/types";

type View = "board" | "calendar";

type TodoCardProps = {
  className?: string;
  archiveDays: number;
  googleCalendar: UseGoogleCalendarResult;
};

/** Main 2x2 tracker: kanban board or calendar over the same task list. */
export function TodoCard({ className, archiveDays, googleCalendar }: TodoCardProps) {
  const { tasks, byStatus, addTask, patchTask, reorderTasks, removeTask } =
    useTodos();
  const [view, setView] = useLocalStorage<View>("pt.todo-view", "board");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Creating uses the quick form; opening an existing card uses the detail view.
  const [createTask, setCreateTask] = useState<Task | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detailTask = detailId
    ? (tasks.find((t) => t.id === detailId) ?? null)
    : null;
  const locale = useLocale();
  const t = messages[locale].features.todo;
  const activeView = mounted ? view : "board";

  function openNew(opts: { dueDate?: string; status?: TaskStatus } = {}) {
    setCreateTask({
      ...BLANK,
      dueDate: opts.dueDate ?? "",
      status: opts.status ?? "todo",
    } as Task);
  }

  async function addTaskAndSync(draft: TaskDialogDraft) {
    // Pass the full draft including googleCalendarId to the backend
    // The backend will create the Google event and save the googleEventId,
    // ensuring the task and event are properly linked.
    await addTask(draft);
  }

  async function convertEventToTask(event: GoogleCalendarEvent) {
    const created = await addTask({
      title: event.title || "Untitled Event",
      description: event.description || "",
      dueDate: event.start.slice(0, 10),
      startAt: event.start,
      endAt: event.end,
      allDay: event.allDay,
      location: event.location,
      status: "todo",
      checklist: [],
      googleCalendarId: event.calendarId,
      googleEventId: event.id,
      googleEventLink: event.htmlLink ?? undefined,
    });
    if (!created) {
      alert(t.calendar.eventDetail.convertError);
    }
  }

  return (
    <BentoCard
      icon={ListChecks}
      title={t.title}
      scrollBody={false}
      className={className}
      action={
        <>
          <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
            <ViewTab
              active={activeView === "board"}
              onClick={() => setView("board")}
              label={t.viewBoard}
            >
              <KanbanSquare size={15} />
              <span className="hidden sm:inline">{t.viewBoard}</span>
            </ViewTab>
            <ViewTab
              active={activeView === "calendar"}
              onClick={() => setView("calendar")}
              label={t.viewCalendar}
            >
              <Calendar size={15} />
              <span className="hidden sm:inline">{t.viewCalendar}</span>
            </ViewTab>
          </div>
          <button
            type="button"
            onClick={() => openNew()}
            className="flex h-9 items-center gap-1.5 rounded-full bg-btn pl-3 pr-3.5 text-[13px] font-semibold text-btn-ink transition-colors hover:opacity-90"
          >
            <Plus size={16} />
            {t.addTask}
          </button>
        </>
      }
    >
      {activeView === "board" ? (
        <KanbanBoard
          byStatus={byStatus}
          onReorder={reorderTasks}
          onOpen={(task) => setDetailId(task.id)}
          onAddTask={(status) => openNew({ status })}
          archiveDays={archiveDays}
        />
      ) : (
        <CalendarView
          tasks={tasks}
          googleCalendar={googleCalendar}
          onOpen={(task) => setDetailId(task.id)}
          onCreateOn={(date) => openNew({ dueDate: date })}
          onConvert={convertEventToTask}
        />
      )}

      <TaskDialog
        open={createTask !== null}
        task={createTask}
        googleCalendarConnected={googleCalendar.connection.connected && !googleCalendar.connection.reconnectRequired}
        googleCalendars={googleCalendar.calendars}
        onClose={() => setCreateTask(null)}
        onSubmit={addTaskAndSync}
      />

      <TaskDetailDialog
        task={detailTask}
        onClose={() => setDetailId(null)}
        onPatch={(patch) => detailId && patchTask(detailId, patch)}
        onDelete={() => detailId && removeTask(detailId)}
      />
    </BentoCard>
  );
}

const BLANK = {
  id: "",
  title: "",
  description: "",
  dueDate: "",
  status: "todo" as const,
  createdAt: 0,
};

function nextDateIso(iso: string) {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + 1);
  return toIsoDate(date);
}

function ViewTab({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors",
        active ? "bg-surface text-ink" : "text-ink-soft hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
