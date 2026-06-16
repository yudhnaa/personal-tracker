import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarConnectionStatus,
} from "@/lib/google-calendar";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getGoogleCalendarConnectionStatus(userId));
}

export async function DELETE() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await disconnectGoogleCalendar(userId));
}
