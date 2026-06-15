import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { notePatchSchema, parseJson } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const [note] = await db.select().from(notes).where(eq(notes.userId, userId)).limit(1);
  return NextResponse.json(note?.text ?? "");
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, notePatchSchema);
  if ("response" in parsed) return parsed.response;
  const { text } = parsed.data;
  await db
    .insert(notes)
    .values({ userId, text, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: notes.userId,
      set: { text, updatedAt: new Date() },
    });
  return NextResponse.json(text);
}
