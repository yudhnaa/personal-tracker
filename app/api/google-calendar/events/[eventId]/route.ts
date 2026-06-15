import { NextResponse, type NextRequest } from "next/server";
import {
  deleteGoogleCalendarEvent,
  googleCalendarApiErrorResponse,
  updateGoogleCalendarEvent,
} from "@/lib/google-calendar";
import { parseJson } from "@/lib/dashboard-validation";
import { googleCalendarEventPatchSchema } from "@/features/google-calendar/validation";
import { requireUserId, unauthorized } from "@/lib/session";

type RouteContext = { params: Promise<{ eventId: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const calendarId = request.nextUrl.searchParams.get("calendarId");
  if (!calendarId) {
    return NextResponse.json({ error: "Missing calendarId" }, { status: 400 });
  }

  const { eventId } = await context.params;
  const parsed = await parseJson(request, googleCalendarEventPatchSchema);
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(await updateGoogleCalendarEvent(userId, calendarId, eventId, parsed.data));
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const calendarId = request.nextUrl.searchParams.get("calendarId");
  if (!calendarId) {
    return NextResponse.json({ error: "Missing calendarId" }, { status: 400 });
  }

  const { eventId } = await context.params;

  try {
    return NextResponse.json(await deleteGoogleCalendarEvent(userId, calendarId, eventId));
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}
