import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections, todos } from "@/db/schema";
import { getTodos, getVisibleTodos, purgeDoneTodos, replaceVisibleTodos, toTask } from "@/lib/dashboard-data";
import { parseJson, taskDraftSchema, taskSchema } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";
import type { Task } from "@/features/todo/task-types";
import { googleCalendarQueue } from "@/lib/queue/google-calendar-queue";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const olderThanDays = request.nextUrl.searchParams.get("olderThanDays");
  if (olderThanDays != null) {
    const days = Number(olderThanDays);
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const count = (await getTodos(userId)).filter(
      (task) => task.status === "done" && task.doneAt != null && task.doneAt < cutoff,
    ).length;
    return NextResponse.json({ count });
  }
  return NextResponse.json(await getVisibleTodos(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, taskDraftSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
  const current = await getTodos(userId);
  const task: Task = { ...body, doneAt: body.doneAt ?? undefined, id: createId(), createdAt: Date.now() };

  if (task.googleCalendarAccountId && task.googleCalendarId && task.googleEventId) {
    const existing = await findExistingGoogleEventTask(userId, task);
    if (existing) return NextResponse.json(toTask(existing));
  }

  const hasExternalGoogleEvent = Boolean(task.googleCalendarAccountId && task.googleCalendarId && task.googleEventId);

  if (task.googleCalendarConnectionId && task.googleCalendarId && !task.googleEventId) {
    task.syncStatus = "pending_sync";
  }

  const insertValues = {
    id: task.id,
    userId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    status: task.status,
    checklist: JSON.stringify(task.checklist ?? []),
    doneAt: task.doneAt ?? null,
    createdAt: task.createdAt,
    position: current.length,
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
  };

  if (hasExternalGoogleEvent) {
    await db
      .insert(todos)
      .values(insertValues)
      .onConflictDoNothing({
        target: [todos.userId, todos.googleCalendarAccountId, todos.googleCalendarId, todos.googleEventId],
      });
    const [stored] = await db
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          eq(todos.googleCalendarAccountId, task.googleCalendarAccountId!),
          eq(todos.googleCalendarId, task.googleCalendarId!),
          eq(todos.googleEventId, task.googleEventId!),
        ),
      )
      .limit(1);
    if (stored) return NextResponse.json(toTask(stored), { status: stored.id === task.id ? 201 : 200 });
  } else {
    await db.insert(todos).values(insertValues);
  }

  if (task.googleCalendarConnectionId && task.googleCalendarId && !task.googleEventId) {
    try {
      await googleCalendarQueue.add("createEvent", {
        type: "createEvent",
        userId,
        todoId: task.id,
      });
    } catch (e) {
      console.error("Failed to enqueue Google Calendar sync", e);
      await db.update(todos).set({ syncStatus: "error" }).where(eq(todos.id, task.id));
      task.syncStatus = "error";
    }
  }

  return NextResponse.json(task, { status: 201 });
}

async function findExistingGoogleEventTask(userId: string, task: Task) {
  if (!task.googleCalendarAccountId || !task.googleCalendarId || !task.googleEventId) return null;

  return db.transaction(async (tx) => {
    const [connection] = task.googleCalendarConnectionId
      ? await tx
          .select({
            id: googleCalendarConnections.id,
            googleEmail: googleCalendarConnections.googleEmail,
          })
          .from(googleCalendarConnections)
          .where(
            and(
              eq(googleCalendarConnections.userId, userId),
              eq(googleCalendarConnections.id, task.googleCalendarConnectionId),
            ),
          )
          .limit(1)
      : [];
    const legacyEmail = connection?.googleEmail && connection.googleEmail !== task.googleCalendarAccountId
      ? connection.googleEmail
      : null;
    const calendarAliases = googleCalendarIdAliases(connection?.googleEmail, task.googleCalendarId!);
    const accountFilter = or(
      eq(todos.googleCalendarAccountId, task.googleCalendarAccountId!),
      ...(legacyEmail ? [eq(todos.googleCalendarAccountId, legacyEmail)] : []),
      isNull(todos.googleCalendarAccountId),
    );
    const matches = await tx
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          calendarAliases.length === 1
            ? eq(todos.googleCalendarId, calendarAliases[0])
            : or(...calendarAliases.map((alias) => eq(todos.googleCalendarId, alias))),
          eq(todos.googleEventId, task.googleEventId!),
          accountFilter,
        ),
      )
      .orderBy(asc(todos.createdAt));
    const canonical = matches[0];
    if (!canonical) return null;

    for (const duplicate of matches.slice(1)) {
      await tx.delete(todos).where(and(eq(todos.userId, userId), eq(todos.id, duplicate.id)));
    }

    const [adopted] = await tx
      .update(todos)
      .set({
        googleCalendarConnectionId: task.googleCalendarConnectionId ?? canonical.googleCalendarConnectionId,
        googleCalendarAccountId: task.googleCalendarAccountId,
        googleCalendarId: canonicalGoogleCalendarId(connection?.googleEmail, task.googleCalendarId!),
        source: "google",
        syncStatus: canonical.syncStatus === "local_only" ? "synced" : canonical.syncStatus,
      })
      .where(and(eq(todos.userId, userId), eq(todos.id, canonical.id)))
      .returning();
    return adopted ?? canonical;
  });
}

function hasGoogleEmail(googleEmail: string | null | undefined) {
  return Boolean(googleEmail && googleEmail !== "Google Calendar");
}

function canonicalGoogleCalendarId(googleEmail: string | null | undefined, calendarId: string) {
  return calendarId === "primary" && hasGoogleEmail(googleEmail) ? googleEmail! : calendarId;
}

function googleCalendarIdAliases(googleEmail: string | null | undefined, calendarId: string) {
  const aliases = [calendarId];
  if (hasGoogleEmail(googleEmail)) {
    if (calendarId === "primary") aliases.push(googleEmail!);
    if (calendarId === googleEmail) aliases.push("primary");
  }
  return Array.from(new Set(aliases));
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, taskSchema.array());
  if ("response" in parsed) return parsed.response;
  const tasks = parsed.data.map(t => ({ ...t, doneAt: t.doneAt ?? undefined }));
  return NextResponse.json(await replaceVisibleTodos(userId, tasks as Task[]));
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const days = Number(request.nextUrl.searchParams.get("olderThanDays") ?? 0);
  return NextResponse.json(await purgeDoneTodos(userId, days));
}
