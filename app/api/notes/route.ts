import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { getNotes } from "@/lib/dashboard-data";
import { noteCreateSchema, parseJson } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getNotes(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, noteCreateSchema);
  if ("response" in parsed) return parsed.response;
  const current = await getNotes(userId);
  const note = {
    id: createId(),
    userId,
    title: parsed.data.title,
    text: parsed.data.text,
    position: current.length,
    createdAt: Date.now(),
    updatedAt: new Date(),
  };
  await db.insert(notes).values(note);
  return NextResponse.json((await getNotes(userId)).find((item) => item.id === note.id), { status: 201 });
}
