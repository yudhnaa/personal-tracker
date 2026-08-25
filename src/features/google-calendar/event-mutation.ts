import type { GoogleCalendarEvent, GoogleCalendarEventDraft, GoogleCalendarEventPatch } from "./types";

/** Google PATCH parsing defaults omitted booleans, so always send a complete
 * mutable event snapshot rather than a partial UI patch. */
export function buildGoogleEventPatch(
  event: GoogleCalendarEvent,
  patch: GoogleCalendarEventPatch,
): GoogleCalendarEventDraft {
  const desired = { ...event, ...patch };
  return {
    connectionId: desired.connectionId,
    calendarId: desired.calendarId,
    title: desired.title,
    description: desired.description,
    location: desired.location,
    start: desired.start,
    end: desired.end,
    allDay: desired.allDay,
  };
}
