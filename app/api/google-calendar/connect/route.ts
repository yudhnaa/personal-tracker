import { buildGoogleAuthorizationRedirect, googleCalendarError } from "@/lib/google-calendar";
import { requireUserId, unauthorized } from "@/lib/session";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();

  try {
    return await buildGoogleAuthorizationRedirect(request, userId);
  } catch (error) {
    return googleCalendarError(error instanceof Error ? error.message : "Google Calendar is not configured");
  }
}
