import { Calendar, KanbanSquare, ListChecks, Plus } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { BentoCard } from "../../components/bento-card";
import { cn } from "../../lib/cn";
import { useLocalStorage } from "../../lib/use-local-storage";
import { CalendarView } from "./calendar-view";
import { KanbanBoard } from "./kanban-board";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TaskDialog, type ItemDialogDraft, type ItemType } from "./task-dialog";
import type { Task, TaskStatus } from "./task-types";
import { useTodos } from "./use-todos";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { UseGoogleCalendarResult } from "../google-calendar/use-google-calendar";
import type { GoogleCalendarEvent } from "../google-calendar/types";

type View = "board" | "calendar";
const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

type TodoCardProps = {
  className?: string;
  googleCalendar: UseGoogleCalendarResult;
  editMode?: boolean;
  onHide?: () => void;
};

export function TodoCard({ className, googleCalendar, editMode, onHide }: TodoCardProps) {
  const { tasks, byStatus, addTask, patchTask, reorderTasks, removeTask } = useTodos();
  const [view, setView] = useLocalStorage<View>("pt.todo-view", "board");
  const mounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );

  // Creating uses the quick form
  const [createItem, setCreateItem] = useState<{ task: Task | null, type: ItemType } | null>(null);
  
  // Opening an existing card uses the detail view
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const detailTask = detailTaskId ? (tasks.find((t) => t.id === detailTaskId) ?? null) : null;
  
  const [detailEvent, setDetailEvent] = useState<GoogleCalendarEvent | null>(null);

  const locale = useLocale();
  const t = messages[locale].features.todo;
  const activeView = mounted ? view : "board";

  function openNew(opts: { dueDate?: string; status?: TaskStatus; type?: ItemType } = {}) {
    setCreateItem({
      task: {
        ...BLANK,
        dueDate: opts.dueDate ?? "",
        status: opts.status ?? "todo",
      } as Task,
      type: opts.type ?? "task",
    });
  }

  async function handleCreateSubmit(draft: ItemDialogDraft) {
    const { type, ...taskDraft } = draft;
    if (type === "task") {
      return Boolean(await addTask(taskDraft));
    } else {
      const created = await googleCalendar.createEvent({
        title: draft.title,
        description: draft.description,
        location: draft.location,
        start: draft.startAt || draft.dueDate, // TaskDialog returns iso format
        end: draft.endAt || "",
        allDay: draft.allDay,
        connectionId: draft.googleCalendarConnectionId!,
        calendarId: draft.googleCalendarId!,
      });
      return Boolean(created);
    }
  }

  async function convertEventToTask(event: GoogleCalendarEvent) {
    const created = await googleCalendar.convertEventToTask(event);
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
      editMode={editMode}
      onHide={onHide}
      action={
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setView("board")}
              className={cn(
                "px-2.5 py-1 rounded-[4px] font-semibold flex items-center gap-1.5 transition-all text-xs",
                activeView === "board"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <KanbanSquare size={13} />
              <span className="hidden sm:inline">{t.viewBoard}</span>
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "px-2.5 py-1 rounded-[4px] font-medium flex items-center gap-1.5 transition-all text-xs",
                activeView === "calendar"
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              )}
            >
              <Calendar size={13} />
              <span className="hidden sm:inline">{t.viewCalendar}</span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0f172a] dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-md text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{t.addTask}</span>
          </button>
        </div>
      }
    >
      {activeView === "board" ? (
        <KanbanBoard
          byStatus={byStatus}
          onReorder={reorderTasks}
          onOpen={(task) => setDetailTaskId(task.id)}
          onAddTask={(status) => openNew({ status })}
        />
      ) : (
        <CalendarView
          tasks={tasks}
          googleCalendar={googleCalendar}
          onOpenTask={(task) => setDetailTaskId(task.id)}
          onOpenEvent={(event) => setDetailEvent(event)}
          onCreateOn={(date) => openNew({ dueDate: date })}
          onConvertEvent={convertEventToTask}
          onToggleTaskStatus={(taskId, done) => patchTask(taskId, { status: done ? "done" : "todo" })}
        />
      )}

      <TaskDialog
        open={createItem !== null}
        task={createItem?.task ?? null}
        defaultType={createItem?.type ?? "task"}
        googleCalendarConnected={googleCalendar.connection.connected}
        googleCalendars={googleCalendar.calendars}
        onClose={() => setCreateItem(null)}
        onSubmit={handleCreateSubmit}
      />

      <TaskDetailDialog
        task={detailTask}
        event={detailEvent}
        onClose={() => {
          setDetailTaskId(null);
          setDetailEvent(null);
        }}
        onPatchTask={(patch) => detailTaskId && patchTask(detailTaskId, patch)}
        onDeleteTask={() => detailTaskId && removeTask(detailTaskId)}
        onPatchEvent={(patch) => {
          if (detailEvent) {
             const oldEvent = detailEvent;
             setDetailEvent({ ...detailEvent, ...patch } as GoogleCalendarEvent);
             googleCalendar.updateEvent(detailEvent, patch).then((newEvent) => {
               if (newEvent) {
                 setDetailEvent(newEvent);
               } else {
                 setDetailEvent(oldEvent); // Rollback on failure
               }
             });
          }
        }}
        onDeleteEvent={() => {
          if (detailEvent) {
            googleCalendar.deleteEvent(detailEvent);
            setDetailEvent(null);
          }
        }}
        onConvertEvent={convertEventToTask}
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
