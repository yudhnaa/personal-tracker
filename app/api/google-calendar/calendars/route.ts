import { NextResponse, type NextRequest } from "next/server";
import {
  googleCalendarApiErrorResponse,
  listGoogleCalendars,
  updateSelectedGoogleCalendars,
} from "@/lib/google-calendar";
import { parseJson } from "@/lib/dashboard-validation";
import { googleCalendarSelectionSchema } from "@/features/google-calendar/validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  try {
    return NextResponse.json(await listGoogleCalendars(userId));
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  const parsed = await parseJson(request, googleCalendarSelectionSchema);
  if ("response" in parsed) return parsed.response;

  try {
    return NextResponse.json(await updateSelectedGoogleCalendars(userId, parsed.data.selectedCalendarIds));
  } catch (error) {
    return googleCalendarApiErrorResponse(error);
  }
}
