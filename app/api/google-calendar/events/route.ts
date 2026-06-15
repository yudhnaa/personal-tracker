import { NextResponse, type NextRequest } from "next/server";
import {
  createGoogleCalendarEvent,
  googleCalendarApiErrorResponse,
  syncGoogleCalendarEvents,
} from "@/lib/google-calendar";
import { parseJson } from "@/lib/dashboard-validation";
import { googleCalendarEventDraftSchema } from "@/features/google-calendar/validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end range" }, { status: 400 });
  }

  try {
    return NextResponse.json(await syncGoogleCalendarEvents(userId, { start, end }));
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(request, googleCalendarEventDraftSchema);
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(await createGoogleCalendarEvent(userId, parsed.data), { status: 201 });
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}
