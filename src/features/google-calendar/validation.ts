import { z } from "zod";

export const googleCalendarSelectionSchema = z.object({
  selectedCalendarIds: z.array(z.string().trim().min(1).max(512)).max(100),
});

const calendarIdSchema = z.string().trim().min(1).max(512);

export const googleCalendarEventDraftSchema = z.object({
  calendarId: calendarIdSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).default(""),
  location: z.string().max(1000).default(""),
  start: z.string().trim().min(1).max(64),
  end: z.string().trim().min(1).max(64),
  allDay: z.boolean().default(false),
});

export const googleCalendarEventPatchSchema = googleCalendarEventDraftSchema.partial();
