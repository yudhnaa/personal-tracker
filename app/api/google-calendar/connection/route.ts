import { NextResponse } from "next/server";
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
