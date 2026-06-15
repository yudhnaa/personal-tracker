import { NextRequest, NextResponse } from "next/server";
import { replaceTodos } from "@/lib/dashboard-data";
import { buildBookmarks, buildHabits, buildTasks, SAMPLE_GROUPS, SAMPLE_NOTE } from "@/lib/sample-data";
import { db } from "@/db";
import { bookmarkGroups, bookmarks, habitCompletions, habits, notes } from "@/db/schema";
import { requireUserId, unauthorized } from "@/lib/session";
import { eq } from "drizzle-orm";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  await replaceTodos(userId, buildTasks());
  await Promise.all([
    db.delete(bookmarks).where(eq(bookmarks.userId, userId)),
    db.delete(bookmarkGroups).where(eq(bookmarkGroups.userId, userId)),
    db.delete(habits).where(eq(habits.userId, userId)),
    db.delete(notes).where(eq(notes.userId, userId)),
  ]);
  const bookmarkRows = buildBookmarks().map((bookmark) => ({ ...bookmark, userId }));
  const groupRows = SAMPLE_GROUPS.map((name, position) => ({
    id: `${userId}-group-${position}`,
    userId,
    name,
    position,
  }));
  const habitRows = buildHabits();
  if (bookmarkRows.length) await db.insert(bookmarks).values(bookmarkRows);
  if (groupRows.length) await db.insert(bookmarkGroups).values(groupRows);
  if (habitRows.length) {
    await db.insert(habits).values(habitRows.map((habit) => ({ id: habit.id, userId, name: habit.name, createdAt: Date.now() })));
    const completions = habitRows.flatMap((habit) => habit.done.map((date) => ({ userId, habitId: habit.id, date })));
    if (completions.length) await db.insert(habitCompletions).values(completions);
  }
  await db.insert(notes).values({ userId, text: SAMPLE_NOTE }).onConflictDoUpdate({
    target: notes.userId,
    set: { text: SAMPLE_NOTE, updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  await Promise.all([
    replaceTodos(userId, []),
    db.delete(bookmarks).where(eq(bookmarks.userId, userId)),
    db.delete(bookmarkGroups).where(eq(bookmarkGroups.userId, userId)),
    db.delete(habits).where(eq(habits.userId, userId)),
    db.delete(notes).where(eq(notes.userId, userId)),
  ]);
  return NextResponse.json({ ok: true });
}
