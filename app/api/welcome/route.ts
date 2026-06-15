import { NextRequest, NextResponse } from "next/server";
import { getWelcomeState, setWelcomeState } from "@/lib/dashboard-data";
import { parseJson, welcomePatchSchema } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getWelcomeState(userId));
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, welcomePatchSchema);
  if ("response" in parsed) return parsed.response;
  return NextResponse.json(await setWelcomeState(userId, parsed.data.welcomed));
}
