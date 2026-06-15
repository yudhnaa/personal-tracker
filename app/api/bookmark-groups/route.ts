import { NextRequest, NextResponse } from "next/server";
import { removeBookmarkGroup, renameBookmarkGroup } from "@/lib/dashboard-data";
import { bookmarkGroupRenameSchema, parseJson } from "@/lib/dashboard-validation";
import { requireUserId, unauthorized } from "@/lib/session";

export async function PATCH(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const parsed = await parseJson(request, bookmarkGroupRenameSchema);
  if ("response" in parsed) return parsed.response;
  return NextResponse.json(await renameBookmarkGroup(userId, parsed.data.from, parsed.data.to));
}

export async function DELETE(request: NextRequest) {
  const userId = await requireUserId();
  if (!userId) return unauthorized();
  const name = request.nextUrl.searchParams.get("name") ?? "";
  return NextResponse.json(await removeBookmarkGroup(userId, name));
}
