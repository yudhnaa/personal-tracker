import { NextRequest, NextResponse } from "next/server";
import { getSettings, upsertSettings } from "@/lib/dashboard-data";
import { parseJson, settingsPatchSchema } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function GET() {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await getSettings(userId));
}

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, settingsPatchSchema);
  if ("response" in parsed) return parsed.response;
  return NextResponse.json(await upsertSettings(userId, parsed.data));
}
