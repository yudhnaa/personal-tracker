export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  connections: GoogleCalendarConnection[];
};

export type GoogleCalendarConnection = {
  id: string;
  googleAccountId: string;
  connected: boolean;
  googleEmail: string;
  selectedCalendarIds: string[];
  syncIntervalMinutes: number;
  reconnectRequired: boolean;
};

export type GoogleCalendarListItem = {
  connectionId: string;
  googleAccountId: string;
  googleEmail: string;
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor: string | null;
  accessRole: string;
  selected: boolean;
};

export type GoogleCalendarEvent = {
  connectionId: string;
  googleAccountId: string;
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
  connectionId: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: string;
  end: string;
  allDay?: boolean;
};

export type GoogleCalendarEventPatch = Partial<GoogleCalendarEventDraft>;
