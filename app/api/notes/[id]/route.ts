import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { getNotes } from "@/lib/dashboard-data";
import { notePatchSchema, parseJson } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  const parsed = await parseJson(request, notePatchSchema);
  if ("response" in parsed) return parsed.response;

  const changes: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) changes.title = parsed.data.title;
  if (parsed.data.text !== undefined) changes.text = parsed.data.text;

  const [updated] = await db
    .update(notes)
    .set(changes)
    .where(and(eq(notes.userId, userId), eq(notes.id, id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json((await getNotes(userId)).find((note) => note.id === id));
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  await db.delete(notes).where(and(eq(notes.userId, userId), eq(notes.id, id)));
  return NextResponse.json({ ok: true });
}
