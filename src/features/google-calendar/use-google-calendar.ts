"use client";

import { useCallback, useEffect, useState } from "react";
import { apiJson } from "@/lib/api-client";
import { useApiState } from "@/lib/use-api-state";
import type {
  GoogleCalendarConnectionStatus,
  GoogleCalendarEvent,
  GoogleCalendarEventDraft,
  GoogleCalendarEventPatch,
  GoogleCalendarListItem,
} from "./types";

type EventRange = { start: string; end: string };

const DEFAULT_CONNECTION: GoogleCalendarConnectionStatus = {
  connected: false,
  googleEmail: null,
  selectedCalendarIds: [],
  syncIntervalMinutes: 5,
  reconnectRequired: false,
};

export type UseGoogleCalendarResult = ReturnType<typeof useGoogleCalendar>;

export function useGoogleCalendar() {
  const {
    data: connection,
    setData: setConnection,
    loading: connectionLoading,
    error: connectionError,
    reload: reloadConnection,
  } = useApiState<GoogleCalendarConnectionStatus>(
    "/api/google-calendar/connection",
    DEFAULT_CONNECTION,
  );
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[]>([]);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [range, setRange] = useState<EventRange | null>(null);
  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markReconnectRequired = useCallback((message: string) => {
    setConnection((current) => ({
      ...current,
      connected: false,
      reconnectRequired: true,
    }));
    setCalendars([]);
    setEvents([]);
    setError(message);
  }, [setConnection]);

  const handleError = useCallback((err: unknown) => {
    const message = extractErrorMessage(err);
    if (message.toLowerCase().includes("reconnect")) {
      markReconnectRequired(message);
    } else {
      setError(message);
    }
  }, [markReconnectRequired]);

  const loadCalendars = useCallback(async () => {
    if (!connection.connected || connection.reconnectRequired) return [];
    setCalendarsLoading(true);
    setError(null);
    try {
      const next = await apiJson<GoogleCalendarListItem[]>("/api/google-calendar/calendars");
      setCalendars(next);
      return next;
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      setCalendarsLoading(false);
    }
  }, [connection.connected, connection.reconnectRequired, handleError]);

  const syncEvents = useCallback(async (nextRange = range) => {
    if (!connection.connected || connection.reconnectRequired || !nextRange) return [];
    setSyncing(true);
    setError(null);
    try {
      const params = new URLSearchParams(nextRange);
      const next = await apiJson<GoogleCalendarEvent[]>(`/api/google-calendar/events?${params.toString()}`);
      setEvents(next);
      return next;
    } catch (err) {
      handleError(err);
      return [];
    } finally {
      setSyncing(false);
    }
  }, [connection.connected, connection.reconnectRequired, handleError, range]);

  useEffect(() => {
    if (connection.connected && !connection.reconnectRequired) {
      void loadCalendars();
    } else {
      setCalendars([]);
      setEvents([]);
    }
  }, [connection.connected, connection.reconnectRequired, loadCalendars]);

  useEffect(() => {
    if (!range || !connection.connected || connection.reconnectRequired) return;
    void syncEvents(range);
  }, [connection.connected, connection.reconnectRequired, range, syncEvents]);

  useEffect(() => {
    if (!range || !connection.connected || connection.reconnectRequired) return;
    const intervalMs = Math.max(connection.syncIntervalMinutes || 5, 1) * 60 * 1000;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      void syncEvents(range);
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [
    connection.connected,
    connection.reconnectRequired,
    connection.syncIntervalMinutes,
    range,
    syncEvents,
  ]);

  function connect() {
    window.location.assign("/api/google-calendar/connect");
  }

  async function disconnect() {
    setError(null);
    const next = await apiJson<GoogleCalendarConnectionStatus>("/api/google-calendar/connection", {
      method: "DELETE",
    });
    setConnection(next);
    setCalendars([]);
    setEvents([]);
  }

  async function toggleCalendar(calendarId: string) {
    const previous = calendars;
    const next = calendars.map((calendar) =>
      calendar.id === calendarId ? { ...calendar, selected: !calendar.selected } : calendar,
    );
    setCalendars(next);
    const selectedCalendarIds = next.filter((calendar) => calendar.selected).map((calendar) => calendar.id);
    try {
      const updated = await apiJson<GoogleCalendarListItem[]>("/api/google-calendar/calendars", {
        method: "PATCH",
        body: JSON.stringify({ selectedCalendarIds }),
      });
      setCalendars(updated);
      setConnection((current) => ({ ...current, selectedCalendarIds }));
      if (range) void syncEvents(range);
    } catch (err) {
      setCalendars(previous);
      handleError(err);
    }
  }

  async function createEvent(draft: GoogleCalendarEventDraft) {
    setError(null);
    try {
      const created = await apiJson<GoogleCalendarEvent>("/api/google-calendar/events", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      setEvents((current) => upsertEvent(current, created));
      return created;
    } catch (err) {
      handleError(err);
      return null;
    }
  }

  async function updateEvent(event: GoogleCalendarEvent, patch: GoogleCalendarEventPatch) {
    const previous = events;
    const optimistic = { ...event, ...patch };
    setEvents((current) => upsertEvent(current, optimistic));
    try {
      const updated = await apiJson<GoogleCalendarEvent>(
        `/api/google-calendar/events/${encodeURIComponent(event.id)}?calendarId=${encodeURIComponent(event.calendarId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );
      setEvents((current) => upsertEvent(current, updated));
      return updated;
    } catch (err) {
      setEvents(previous);
      handleError(err);
      return null;
    }
  }

  async function deleteEvent(event: GoogleCalendarEvent) {
    const previous = events;
    setEvents((current) => current.filter((item) => item.id !== event.id || item.calendarId !== event.calendarId));
    try {
      await apiJson<{ ok: true }>(
        `/api/google-calendar/events/${encodeURIComponent(event.id)}?calendarId=${encodeURIComponent(event.calendarId)}`,
        { method: "DELETE" },
      );
    } catch (err) {
      setEvents(previous);
      handleError(err);
    }
  }

  return {
    connection,
    calendars,
    events,
    range,
    loading: connectionLoading,
    calendarsLoading,
    syncing,
    error: error ?? connectionError,
    connect,
    disconnect,
    reloadConnection,
    loadCalendars,
    toggleCalendar,
    setVisibleRange: setRange,
    syncNow: syncEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}

function upsertEvent(events: GoogleCalendarEvent[], event: GoogleCalendarEvent) {
  const exists = events.some((item) => item.id === event.id && item.calendarId === event.calendarId);
  if (!exists) return [...events, event].sort((a, b) => a.start.localeCompare(b.start));
  return events
    .map((item) => (item.id === event.id && item.calendarId === event.calendarId ? event : item))
    .sort((a, b) => a.start.localeCompare(b.start));
}

function extractErrorMessage(err: unknown) {
  if (!(err instanceof Error)) return "Google Calendar request failed";
  try {
    const parsed = JSON.parse(err.message) as { error?: string };
    return parsed.error ?? err.message;
  } catch {
    return err.message;
  }
}
