import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { getTodos, purgeDoneTodos, replaceTodos } from "@/lib/dashboard-data";
import { parseJson, taskDraftSchema, taskSchema } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";
import type { Task } from "@/features/todo/task-types";
import { type GoogleCalendarEventDraft } from "@/lib/google-calendar";
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
  return NextResponse.json(await getTodos(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, taskDraftSchema);
  if ("response" in parsed) return parsed.response;
  const body = parsed.data;
  const current = await getTodos(userId);
  const task: Task = { ...body, id: createId(), createdAt: Date.now() };

  if (task.googleCalendarId && !task.googleEventId) {
    task.syncStatus = "pending_sync";

    try {
      await googleCalendarQueue.add("createEvent", {
        type: "createEvent",
        userId,
        todoId: task.id,
      });
    } catch (e) {
      console.error("Failed to enqueue Google Calendar sync", e);
      task.syncStatus = "error";
    }
  }

  await db.insert(todos).values({
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
    googleCalendarId: task.googleCalendarId ?? null,
    googleEventId: task.googleEventId ?? null,
    googleEventLink: task.googleEventLink ?? null,
    googleEventPayload: task.googleEventPayload ?? null,
  });



  return NextResponse.json(task, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, taskSchema.array());
  if ("response" in parsed) return parsed.response;
  return NextResponse.json(await replaceTodos(userId, parsed.data));
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const days = Number(request.nextUrl.searchParams.get("olderThanDays") ?? 0);
  return NextResponse.json(await purgeDoneTodos(userId, days));
}
