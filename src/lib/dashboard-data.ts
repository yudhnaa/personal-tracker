import { and, asc, eq, gte, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  bookmarkGroups,
  bookmarks,
  dashboardSettings,
  habitCompletions,
  habits,
  notes,
  subscriptions,
  todos,
  user,
} from "@/db/schema";
import { createId } from "./id";
import { DEFAULT_SETTINGS, type Settings } from "./settings";
import { startOfTodayInTimeZoneMs, todayIsoInTimeZone } from "./timezone";
import {
  sortSubscriptionsForToday,
  subscriptionStatus,
  type BillingCycle,
  type Subscription,
} from "./subscription-utils";
import type { Bookmark } from "@/features/bookmarks/use-bookmarks";
import type { Habit } from "@/features/habits/use-habits";
import type { Task, TaskSource, TaskSyncStatus } from "@/features/todo/task-types";

export type Note = {
  id: string;
  title: string;
  text: string;
  position: number;
  createdAt: number;
  updatedAt: string;
};

export function parseChecklist(value: string): Task["checklist"] {
  try {
    return JSON.parse(value) as Task["checklist"];
  } catch {
    return [];
  }
}

export function toTask(row: typeof todos.$inferSelect): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    dueDate: row.dueDate,
    source: row.source as TaskSource,
    syncStatus: row.syncStatus as TaskSyncStatus,
    startAt: row.startAt ?? undefined,
    endAt: row.endAt ?? undefined,
    allDay: row.allDay,
    location: row.location ?? undefined,
    googleCalendarConnectionId: row.googleCalendarConnectionId ?? undefined,
    googleCalendarAccountId: row.googleCalendarAccountId ?? undefined,
    googleCalendarId: row.googleCalendarId ?? undefined,
    googleEventId: row.googleEventId ?? undefined,
    googleEventLink: row.googleEventLink ?? undefined,
    googleEventPayload: (row.googleEventPayload as Record<string, any>) ?? undefined,
    status: row.status as Task["status"],
    createdAt: row.createdAt,
    doneAt: row.doneAt ?? undefined,
    checklist: parseChecklist(row.checklist),
  };
}

export function toBookmark(row: typeof bookmarks.$inferSelect): Bookmark {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    group: row.group,
    createdAt: row.createdAt,
  };
}

export async function getSettings(userId: string): Promise<Settings> {
  const [stored] = await db
    .select()
    .from(dashboardSettings)
    .where(eq(dashboardSettings.userId, userId))
    .limit(1);
  return stored
    ? {
        boardTitle: stored.boardTitle,
        theme: stored.theme as Settings["theme"],
        primary: stored.primary,
        background: stored.background,
        archiveDays: stored.archiveDays,
        layout: stored.layout as Record<string, any> | null,
        hiddenCards: stored.hiddenCards ? JSON.parse(stored.hiddenCards) : [],
      }
    : DEFAULT_SETTINGS;
}

export async function getUserTimeZone(userId: string) {
  const [stored] = await db
    .select({ timeZone: user.timeZone })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return stored?.timeZone ?? "UTC";
}

export async function upsertSettings(userId: string, patch: Partial<Settings>) {
  const current = await getSettings(userId);
  const next = { ...current, ...patch };
  await db
    .insert(dashboardSettings)
    .values({
      userId,
      boardTitle: next.boardTitle,
      theme: next.theme,
      primary: next.primary,
      background: next.background,
      archiveDays: next.archiveDays,
      layout: next.layout,
      hiddenCards: JSON.stringify(next.hiddenCards || []),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardSettings.userId,
      set: {
        boardTitle: next.boardTitle,
        theme: next.theme,
        primary: next.primary,
        background: next.background,
        archiveDays: next.archiveDays,
        layout: next.layout,
        hiddenCards: JSON.stringify(next.hiddenCards || []),
        updatedAt: new Date(),
      },
    });
  return next;
}

export async function getWelcomeState(userId: string) {
  const [stored] = await db
    .select({ welcomed: dashboardSettings.welcomed })
    .from(dashboardSettings)
    .where(eq(dashboardSettings.userId, userId))
    .limit(1);
  return stored?.welcomed ?? false;
}

export async function setWelcomeState(userId: string, welcomed: boolean) {
  const settings = await getSettings(userId);
  await db
    .insert(dashboardSettings)
    .values({ 
      userId, 
      ...settings, 
      hiddenCards: JSON.stringify(settings.hiddenCards || []),
      welcomed, 
      updatedAt: new Date() 
    })
    .onConflictDoUpdate({
      target: dashboardSettings.userId,
      set: { welcomed, updatedAt: new Date() },
    });
  return welcomed;
}

export async function getTodos(userId: string) {
  const rows = await db
    .select()
    .from(todos)
    .where(eq(todos.userId, userId))
    .orderBy(asc(todos.position), asc(todos.createdAt));
  return rows.map(toTask);
}

export async function getVisibleTodos(userId: string) {
  const timeZone = await getUserTimeZone(userId);
  const todayStart = startOfTodayInTimeZoneMs(timeZone);
  const rows = await db
    .select()
    .from(todos)
    .where(
      and(
        eq(todos.userId, userId),
        or(
          ne(todos.status, "done"),
          gte(todos.doneAt, todayStart),
        ),
      ),
    )
    .orderBy(asc(todos.position), asc(todos.createdAt));
  return rows.map(toTask);
}

export async function replaceTodos(userId: string, next: Task[]) {
  return await db.transaction(async (tx) => {
    await tx.delete(todos).where(eq(todos.userId, userId));
    if (next.length) {
      await tx.insert(todos).values(
        next.map((task, index) => ({
          id: task.id,
          userId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          checklist: JSON.stringify(task.checklist ?? []),
          doneAt: task.doneAt ?? null,
          createdAt: task.createdAt,
          position: index,
          source: task.source,
          syncStatus: task.syncStatus,
          startAt: task.startAt ?? null,
          endAt: task.endAt ?? null,
          allDay: task.allDay ?? false,
          location: task.location ?? "",
          googleCalendarConnectionId: task.googleCalendarConnectionId ?? null,
          googleCalendarAccountId: task.googleCalendarAccountId ?? null,
          googleCalendarId: task.googleCalendarId ?? null,
          googleEventId: task.googleEventId ?? null,
          googleEventLink: task.googleEventLink ?? null,
          googleEventPayload: task.googleEventPayload ?? null,
        })),
      );
    }
    const rows = await tx
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(asc(todos.position), asc(todos.createdAt));
    return rows.map(toTask);
  });
}

export async function replaceVisibleTodos(userId: string, next: Task[]) {
  await db.transaction(async (tx) => {
    const currentRows = await tx
      .select()
      .from(todos)
      .where(eq(todos.userId, userId))
      .orderBy(asc(todos.position), asc(todos.createdAt));
    const incomingIds = new Set(next.map((task) => task.id));
    const preserved = currentRows
      .map(toTask)
      .filter((task) => !incomingIds.has(task.id) && task.status === "done");
    const merged = [...next, ...preserved];

    await tx.delete(todos).where(eq(todos.userId, userId));
    if (merged.length) {
      await tx.insert(todos).values(
        merged.map((task, index) => ({
          id: task.id,
          userId,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          status: task.status,
          checklist: JSON.stringify(task.checklist ?? []),
          doneAt: task.doneAt ?? null,
          createdAt: task.createdAt,
          position: index,
          source: task.source,
          syncStatus: task.syncStatus,
          startAt: task.startAt ?? null,
          endAt: task.endAt ?? null,
          allDay: task.allDay ?? false,
          location: task.location ?? "",
          googleCalendarConnectionId: task.googleCalendarConnectionId ?? null,
          googleCalendarAccountId: task.googleCalendarAccountId ?? null,
          googleCalendarId: task.googleCalendarId ?? null,
          googleEventId: task.googleEventId ?? null,
          googleEventLink: task.googleEventLink ?? null,
          googleEventPayload: task.googleEventPayload ?? null,
        })),
      );
    }
  });
  return getVisibleTodos(userId);
}

export function toNote(row: typeof notes.$inferSelect): Note {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    position: row.position,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getNotes(userId: string) {
  const rows = await db
    .select()
    .from(notes)
    .where(eq(notes.userId, userId))
    .orderBy(asc(notes.position), asc(notes.createdAt));
  return rows.map(toNote);
}

export async function getBookmarks(userId: string) {
  const [bookmarkRows, groupRows] = await Promise.all([
    db.select().from(bookmarks).where(eq(bookmarks.userId, userId)).orderBy(asc(bookmarks.createdAt)),
    db.select().from(bookmarkGroups).where(eq(bookmarkGroups.userId, userId)).orderBy(asc(bookmarkGroups.position)),
  ]);
  return {
    bookmarks: bookmarkRows.map(toBookmark),
    groups: groupRows.map((group) => group.name),
  };
}

export async function addBookmarkGroup(userId: string, name: string) {
  const existing = await getBookmarks(userId);
  if (!existing.groups.includes(name)) {
    await db.insert(bookmarkGroups).values({
      id: createId(),
      userId,
      name,
      position: existing.groups.length,
    });
  }
  return getBookmarks(userId);
}

export async function renameBookmarkGroup(userId: string, from: string, to: string) {
  await db
    .update(bookmarkGroups)
    .set({ name: to })
    .where(and(eq(bookmarkGroups.userId, userId), eq(bookmarkGroups.name, from)));
  await db
    .update(bookmarks)
    .set({ group: to })
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.group, from)));
  return getBookmarks(userId);
}

export async function removeBookmarkGroup(userId: string, name: string) {
  await db
    .delete(bookmarkGroups)
    .where(and(eq(bookmarkGroups.userId, userId), eq(bookmarkGroups.name, name)));
  await db
    .update(bookmarks)
    .set({ group: "" })
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.group, name)));
  return getBookmarks(userId);
}

export async function getHabits(userId: string): Promise<Habit[]> {
  const [habitRows, doneRows] = await Promise.all([
    db.select().from(habits).where(eq(habits.userId, userId)).orderBy(asc(habits.createdAt)),
    db.select().from(habitCompletions).where(eq(habitCompletions.userId, userId)),
  ]);
  const doneByHabit = new Map<string, string[]>();
  for (const row of doneRows) {
    doneByHabit.set(row.habitId, [...(doneByHabit.get(row.habitId) ?? []), row.date]);
  }
  return habitRows.map((habit) => ({
    id: habit.id,
    name: habit.name,
    done: doneByHabit.get(habit.id) ?? [],
  }));
}

export function toSubscription(
  row: typeof subscriptions.$inferSelect,
  todayIso: string,
): Subscription {
  return {
    id: row.id,
    name: row.name,
    amount: row.amountCents / 100,
    billingCycle: row.billingCycle as BillingCycle,
    nextRenewalDate: row.nextRenewalDate,
    lastPaymentDate: row.lastPaymentDate ?? null,
    status: subscriptionStatus(row.nextRenewalDate, todayIso),
  };
}

export async function getSubscriptions(userId: string): Promise<Subscription[]> {
  const timeZone = await getUserTimeZone(userId);
  const todayIso = todayIsoInTimeZone(timeZone);
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(asc(subscriptions.nextRenewalDate), asc(subscriptions.createdAt));
  return sortSubscriptionsForToday(rows.map((row) => toSubscription(row, todayIso)), todayIso);
}

export async function purgeDoneTodos(userId: string, days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const current = await getTodos(userId);
  const count = current.filter((task) => task.status === "done" && task.doneAt != null && task.doneAt < cutoff).length;
  await db
    .delete(todos)
    .where(and(eq(todos.userId, userId), eq(todos.status, "done"), lt(todos.doneAt, cutoff)));
  return { count };
}
