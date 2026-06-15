import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { habitCompletions, habits } from "@/db/schema";
import { getHabits } from "@/lib/dashboard-data";
import { todayIso } from "@/lib/date";
import { requireUserId, unauthorized } from "@/lib/session";

export async function PATCH(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  const [habit] = await db
    .select({ id: habits.id })
    .from(habits)
    .where(and(eq(habits.userId, userId), eq(habits.id, id)))
    .limit(1);
  if (!habit) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const today = todayIso();
  const [existing] = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.habitId, id), eq(habitCompletions.date, today)))
    .limit(1);
  if (existing) {
    await db
      .delete(habitCompletions)
      .where(and(eq(habitCompletions.userId, userId), eq(habitCompletions.habitId, id), eq(habitCompletions.date, today)));
  } else {
    await db.insert(habitCompletions).values({ userId, habitId: id, date: today });
  }
  return NextResponse.json(await getHabits(userId));
}

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  await db.delete(habits).where(and(eq(habits.userId, userId), eq(habits.id, id)));
  return NextResponse.json(await getHabits(userId));
}
