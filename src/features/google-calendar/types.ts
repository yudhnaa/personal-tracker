export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  googleEmail: string | null;
  selectedCalendarIds: string[];
  syncIntervalMinutes: number;
  reconnectRequired: boolean;
};

export type GoogleCalendarListItem = {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
  accessRole: string;
  selected: boolean;
};

export type GoogleCalendarEvent = {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
  allDay: boolean;
  etag: string | null;
  htmlLink: string | null;
  updated: string | null;
};

export type GoogleCalendarEventDraft = {
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
};

export type GoogleCalendarEventPatch = Partial<GoogleCalendarEventDraft>;
