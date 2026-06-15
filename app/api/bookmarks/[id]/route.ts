import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookmarks } from "@/db/schema";
import { getBookmarks } from "@/lib/dashboard-data";
import { requireUserId, unauthorized } from "@/lib/session";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  await db.delete(bookmarks).where(and(eq(bookmarks.userId, userId), eq(bookmarks.id, id)));
  return NextResponse.json(await getBookmarks(userId));
}
