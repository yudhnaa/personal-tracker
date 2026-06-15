import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "./auth";

export async function requireUserId() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
