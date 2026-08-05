import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPaymentConfirmations, subscriptions } from "@/db/schema";
import {
  getUserTimeZone,
  toSubscription,
} from "@/lib/dashboard-data";
import { createId } from "@/lib/id";
import { resolveSubscriptionConfirmation } from "@/lib/subscription-utils";
import { todayIsoInTimeZone } from "@/lib/timezone";
import { requireUserId, unauthorized } from "@/lib/session";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const { id } = await context.params;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim() || null;
  if (!idempotencyKey || idempotencyKey.length > 120) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required" },
      { status: 400 },
    );
  }
  const serverNow = new Date();
  const timeZone = await getUserTimeZone(userId);
  const serverToday = todayIsoInTimeZone(timeZone, serverNow);

  const [updated] = await db.transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.id, id)))
      .limit(1);
    if (!current) return [];
    const [existingConfirmation] = await tx
      .select({ idempotencyKey: subscriptionPaymentConfirmations.idempotencyKey })
      .from(subscriptionPaymentConfirmations)
      .where(
        and(
          eq(subscriptionPaymentConfirmations.userId, userId),
          eq(subscriptionPaymentConfirmations.subscriptionId, id),
          eq(subscriptionPaymentConfirmations.idempotencyKey, idempotencyKey),
        ),
      )
      .limit(1);
    if (existingConfirmation) {
      return [current];
    }

    const [insertedConfirmation] = await tx
      .insert(subscriptionPaymentConfirmations)
      .values({
        id: createId(),
        idempotencyKey,
        userId,
        subscriptionId: id,
        createdAt: serverNow,
      })
      .onConflictDoNothing()
      .returning({ idempotencyKey: subscriptionPaymentConfirmations.idempotencyKey });
    if (!insertedConfirmation) {
      const [latest] = await tx
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.id, id)))
        .limit(1);
      return latest ? [latest] : [];
    }

    const confirmation = resolveSubscriptionConfirmation(
      {
        billingCycle: current.billingCycle as "monthly" | "yearly",
        nextRenewalDate: current.nextRenewalDate,
        confirmedRenewalDate: current.confirmedRenewalDate,
      },
      serverToday,
    );
    if (!confirmation.shouldAdvance) {
      return [current];
    }

    const [next] = await tx
      .update(subscriptions)
      .set({
        lastPaymentDate: serverToday,
        confirmedRenewalDate: confirmation.confirmedRenewalDate,
        nextRenewalDate: confirmation.nextRenewalDate,
        updatedAt: serverNow,
      })
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.id, id)))
      .returning();
    return next ? [next] : [];
  });

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(toSubscription(updated, serverToday));
}
