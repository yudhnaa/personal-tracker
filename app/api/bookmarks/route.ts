import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { addBookmarkGroup, getBookmarks } from "@/lib/dashboard-data";
import { bookmarkDraftSchema, bookmarkGroupCreateSchema, validationError } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getBookmarks(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const group = bookmarkGroupCreateSchema.safeParse(body);
  if (group.success) {
    return NextResponse.json(await addBookmarkGroup(userId, group.data.group));
  }
  const draftResult = bookmarkDraftSchema.safeParse(body);
  if (!draftResult.success) return validationError(draftResult.error);
  const draft = draftResult.data;
  await db.insert(bookmarks).values({
    id: createId(),
    userId,
    url: draft.url,
    title: draft.title,
    group: draft.group,
    createdAt: Date.now(),
  });
  if (draft.group) await addBookmarkGroup(userId, draft.group);
  return NextResponse.json(await getBookmarks(userId), { status: 201 });
}
