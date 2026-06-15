import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { habits } from "@/db/schema";
import { getHabits } from "@/lib/dashboard-data";
import { habitCreateSchema, parseJson } from "@/lib/dashboard-validation";
import { createId } from "@/lib/id";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getHabits(userId));
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, habitCreateSchema);
  if ("response" in parsed) return parsed.response;
  await db.insert(habits).values({
    id: createId(),
    userId,
    name: parsed.data.name,
    createdAt: Date.now(),
  });
  return NextResponse.json(await getHabits(userId), { status: 201 });
}
