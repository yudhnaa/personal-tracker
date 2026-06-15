import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getTodos } from "@/lib/dashboard-data";
import { parseJson, taskPatchSchema } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";
import { type GoogleCalendarEventDraft } from "@/lib/google-calendar";
import { googleCalendarQueue } from "@/lib/queue/google-calendar-queue";


export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  const parsed = await parseJson(request, taskPatchSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
  const changes: Partial<typeof todos.$inferInsert> = {};
  if (body.title !== undefined) changes.title = body.title;
  if (body.description !== undefined) changes.description = body.description;
  if (body.dueDate !== undefined) changes.dueDate = body.dueDate;
  if (body.status !== undefined) changes.status = body.status;
  if (body.checklist !== undefined) changes.checklist = JSON.stringify(body.checklist);
  if (body.doneAt !== undefined) changes.doneAt = body.doneAt;
  if (body.source !== undefined) changes.source = body.source;
  if (body.syncStatus !== undefined) changes.syncStatus = body.syncStatus;
  if (body.startAt !== undefined) changes.startAt = body.startAt ?? null;
  if (body.endAt !== undefined) changes.endAt = body.endAt ?? null;
  if (body.allDay !== undefined) changes.allDay = body.allDay;
  if (body.location !== undefined) changes.location = body.location;
  if (body.googleCalendarId !== undefined) changes.googleCalendarId = body.googleCalendarId ?? null;
  if (body.googleEventId !== undefined) changes.googleEventId = body.googleEventId ?? null;
  if (body.googleEventLink !== undefined) changes.googleEventLink = body.googleEventLink ?? null;
  if (body.googleEventPayload !== undefined) changes.googleEventPayload = body.googleEventPayload ?? null;

  const [existing] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.id, id)));
  
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isLinkedTask = !!existing.googleCalendarId;
  const hasSyncableChanges =
    body.title !== undefined ||
    body.description !== undefined ||
    body.location !== undefined ||
    body.startAt !== undefined ||
    body.dueDate !== undefined ||
    body.endAt !== undefined ||
    body.allDay !== undefined;

  if (isLinkedTask && hasSyncableChanges) {
    changes.syncStatus = "pending_sync";
  }

  await db
    .update(todos)
    .set(changes)
    .where(and(eq(todos.userId, userId), eq(todos.id, id)));

  if (isLinkedTask && hasSyncableChanges && existing.googleEventId) {
    try {
      await googleCalendarQueue.add("updateEvent", {
        type: "updateEvent",
        userId,
        todoId: id,
      });
    } catch (e) {
      console.error("Failed to enqueue Google Calendar update", e);
      await db.update(todos).set({ syncStatus: "error" }).where(and(eq(todos.userId, userId), eq(todos.id, id)));
    }
  }

  return NextResponse.json(await getTodos(userId));
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;

  const [existing] = await db
    .select()
    .from(todos)
    .where(and(eq(todos.userId, userId), eq(todos.id, id)));

  if (existing?.googleCalendarId && existing?.googleEventId) {
    try {
      await googleCalendarQueue.add("deleteEvent", {
        type: "deleteEvent",
        userId,
        calendarId: existing.googleCalendarId,
        eventId: existing.googleEventId,
      });
    } catch (e) {
      console.error("Failed to enqueue Google Calendar delete", e);
    }
  }

  await db.delete(todos).where(and(eq(todos.userId, userId), eq(todos.id, id)));
  return NextResponse.json(await getTodos(userId));
}

