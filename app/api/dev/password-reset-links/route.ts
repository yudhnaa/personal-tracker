import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { devPasswordResetLinks } from "@/db/schema";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const links = await db
    .select()
    .from(devPasswordResetLinks)
    .orderBy(desc(devPasswordResetLinks.createdAt))
    .limit(5);
  return NextResponse.json(links);
}
