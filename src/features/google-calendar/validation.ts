import { z } from "zod";

export const googleCalendarSelectionSchema = z.object({
  connectionId: z.string().trim().min(1).max(255),
  selectedCalendarIds: z.array(z.string().trim().min(1).max(512)).max(100),
});

const calendarIdSchema = z.string().trim().min(1).max(512);
const connectionIdSchema = z.string().trim().min(1).max(255);

export const googleCalendarEventDraftSchema = z.object({
  connectionId: connectionIdSchema,
  calendarId: calendarIdSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  location: z.string().max(1000).default(""),
  start: z.string().trim().min(1).max(64),
  end: z.string().trim().min(1).max(64),
  allDay: z.boolean().default(false),
});

export const googleCalendarEventPatchSchema = googleCalendarEventDraftSchema.partial();
