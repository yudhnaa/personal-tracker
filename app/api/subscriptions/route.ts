import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { getSubscriptions } from "@/lib/dashboard-data";
import { parseJson, subscriptionCreateSchema } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getSubscriptions(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, subscriptionCreateSchema);
  if ("response" in parsed) return parsed.response;
  const draft = parsed.data;
  await db.insert(subscriptions).values({
    id: createId(),
    userId,
    name: draft.name,
    amountCents: Math.round(draft.amount * 100),
    billingCycle: draft.billingCycle,
    nextRenewalDate: draft.nextRenewalDate,
    lastPaymentDate: draft.lastPaymentDate ?? null,
    createdAt: Date.now(),
    updatedAt: new Date(),
  });
  return NextResponse.json(await getSubscriptions(userId), { status: 201 });
}
