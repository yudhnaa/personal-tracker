import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { TASK_STATUSES } from "@/features/todo/task-types";

const checklistItemSchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  done: z.boolean(),
});

export const taskDraftSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).default(""),
  dueDate: z.string().max(32).default(""),
  status: z.enum(TASK_STATUSES),
  checklist: z.array(checklistItemSchema).default([]),
  doneAt: z.number().int().nonnegative().optional(),
  source: z.enum(["local", "google"]).default("local"),
  syncStatus: z.enum(["local_only", "synced", "pending_sync", "error"]).default("local_only"),
  startAt: z.string().max(32).optional(),
  endAt: z.string().max(32).optional(),
  allDay: z.boolean().default(false),
  location: z.string().max(1000).optional(),
  googleCalendarId: z.string().max(255).optional(),
  googleEventId: z.string().max(1024).optional(),
  googleEventLink: z.string().url().max(2048).optional(),
  googleEventPayload: z.record(z.string(), z.any()).optional(),
});

export const taskSchema = taskDraftSchema.extend({
  id: z.string().min(1),
  createdAt: z.number().int().nonnegative(),
});

export const taskPatchSchema = taskDraftSchema.partial();

export const settingsPatchSchema = z
  .object({
    boardTitle: z.string().trim().min(1).max(120),
    theme: z.enum(["light", "dark"]),
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    background: z.string().max(256),
    archiveDays: z.number().int().min(0).max(3650),
  })
  .partial();

export const bookmarkDraftSchema = z.object({
  url: z.string().url().max(2048),
  title: z.string().trim().min(1).max(200),
  group: z.string().trim().max(120).default(""),
});

export const bookmarkGroupCreateSchema = z.object({
  kind: z.literal("group"),
  group: z.string().trim().min(1).max(120),
});

export const bookmarkGroupRenameSchema = z.object({
  from: z.string().trim().min(1).max(120),
  to: z.string().trim().min(1).max(120),
});

export const habitCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export const notePatchSchema = z.object({
  text: z.string().max(50000).default(""),
});

export const welcomePatchSchema = z.object({
  welcomed: z.boolean(),
});

export function validationError(error: z.ZodError) {
  return NextResponse.json(
    { error: "Invalid request body", issues: error.issues },
    { status: 400 },
  );
}

export async function parseJson<T extends z.ZodType>(
  request: NextRequest,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON" }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return { response: validationError(parsed.error) };
  return { data: parsed.data };
}
