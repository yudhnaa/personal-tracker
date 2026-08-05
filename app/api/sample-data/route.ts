import { NextRequest, NextResponse } from "next/server";
import { replaceTodos } from "@/lib/dashboard-data";
import { buildBookmarks, buildHabits, buildSubscriptions, buildTasks, SAMPLE_GROUPS, SAMPLE_NOTE } from "@/lib/sample-data";
import { db } from "@/db";
import { bookmarkGroups, bookmarks, habitCompletions, habits, notes, subscriptions } from "@/db/schema";
import { requireUserId, unauthorized } from "@/lib/session";
import { eq } from "drizzle-orm";
import { createId } from "@/lib/id";

export async function POST() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  await replaceTodos(userId, buildTasks());
  await Promise.all([
    db.delete(bookmarks).where(eq(bookmarks.userId, userId)),
    db.delete(bookmarkGroups).where(eq(bookmarkGroups.userId, userId)),
    db.delete(habits).where(eq(habits.userId, userId)),
    db.delete(notes).where(eq(notes.userId, userId)),
    db.delete(subscriptions).where(eq(subscriptions.userId, userId)),
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
  const subscriptionRows = buildSubscriptions();
  if (subscriptionRows.length) {
    await db.insert(subscriptions).values(
      subscriptionRows.map((subscription) => ({
        id: subscription.id,
        userId,
        name: subscription.name,
        amountCents: Math.round(subscription.amount * 100),
        billingCycle: subscription.billingCycle,
        nextRenewalDate: subscription.nextRenewalDate,
        lastPaymentDate: subscription.lastPaymentDate,
        confirmedRenewalDate: null,
        createdAt: Date.now(),
        updatedAt: new Date(),
      })),
    );
  }
  await db.insert(notes).values({
    id: createId(),
    userId,
    title: "Note",
    text: SAMPLE_NOTE,
    position: 0,
    createdAt: Date.now(),
    updatedAt: new Date(),
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
    db.delete(subscriptions).where(eq(subscriptions.userId, userId)),
  ]);
  return NextResponse.json({ ok: true });
}
