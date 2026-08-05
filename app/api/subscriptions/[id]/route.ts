import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getSubscriptions } from "@/lib/dashboard-data";
import { requireUserId, unauthorized } from "@/lib/session";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  await db
    .delete(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.id, id)));
  return NextResponse.json(await getSubscriptions(userId));
}
