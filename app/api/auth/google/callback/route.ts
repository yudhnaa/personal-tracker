import { NextResponse, type NextRequest } from "next/server";
import { storeGoogleCalendarConnection, verifyGoogleOAuthState } from "@/lib/google-calendar";
import { requireUserId } from "@/lib/session";

export async function GET(request: NextRequest) {
  const userId = await requireUserId();
  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const redirectUrl = new URL("/dashboard", baseUrl);

  if (!userId) {
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("googleCalendar", "login-required");
    return NextResponse.redirect(redirectUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  if (oauthError) {
    redirectUrl.searchParams.set("googleCalendar", "denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !verifyGoogleOAuthState(state, userId)) {
    redirectUrl.searchParams.set("googleCalendar", "invalid");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    await storeGoogleCalendarConnection(request, userId, code);
    redirectUrl.searchParams.set("googleCalendar", "connected");
  } catch (error) {
    console.error("[personal-tracker] Google Calendar OAuth callback failed", error);
    redirectUrl.searchParams.set("googleCalendar", "error");
  }

  return NextResponse.redirect(redirectUrl);
}
