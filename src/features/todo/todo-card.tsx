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
