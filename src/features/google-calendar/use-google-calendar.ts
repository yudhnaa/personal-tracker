"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
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
  
  const [range, setRange] = useState<EventRange | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("googleCalendar") === "connected") {
        void queryClient.invalidateQueries({ queryKey: ["/api/google-calendar/connection"] });
        url.searchParams.delete("googleCalendar");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [queryClient]);

  const markReconnectRequired = useCallback((message: string) => {
    setConnection((current) => ({
      ...current,
      connected: false,
      reconnectRequired: true,
    }));
    setError(message);
    queryClient.setQueryData(["/api/google-calendar/calendars"], []);
    queryClient.setQueryData(["/api/google-calendar/events", range ? new URLSearchParams(range).toString() : ""], []);
  }, [setConnection, queryClient, range]);

  const handleError = useCallback((err: unknown) => {
    const message = extractErrorMessage(err);
    if (message.toLowerCase().includes("reconnect")) {
      markReconnectRequired(message);
    } else {
      setError(message);
    }
  }, [markReconnectRequired]);

  const { data: calendarsData, isLoading: calendarsLoading, refetch: loadCalendars } = useQuery({
    queryKey: ["/api/google-calendar/calendars"],
    queryFn: async () => {
      try {
        return await apiJson<GoogleCalendarListItem[]>("/api/google-calendar/calendars");
      } catch (err) {
        handleError(err);
        return [];
      }
    },
    enabled: connection.connected && !connection.reconnectRequired,
  });
  const calendars = calendarsData || [];

  const paramsString = range ? new URLSearchParams(range).toString() : "";
  const eventsQueryKey = ["/api/google-calendar/events", paramsString];

  const { data: eventsData, isFetching: syncing, refetch: syncNow } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      try {
        return await apiJson<GoogleCalendarEvent[]>(`/api/google-calendar/events?${paramsString}`);
      } catch (err) {
        handleError(err);
        return [];
      }
    },
    enabled: !!range && connection.connected && !connection.reconnectRequired,
  });
  const events = eventsData || [];

  useEffect(() => {
    if (!range || !connection.connected || connection.reconnectRequired) return;
    const intervalMs = Math.max(connection.syncIntervalMinutes || 5, 1) * 60 * 1000;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      void syncNow();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [connection.connected, connection.reconnectRequired, connection.syncIntervalMinutes, range, syncNow]);

  function connect() {
    window.location.assign("/api/google-calendar/connect");
  }

  async function disconnect() {
    setError(null);
    const next = await apiJson<GoogleCalendarConnectionStatus>("/api/google-calendar/connection", {
      method: "DELETE",
    });
    setConnection(next);
    queryClient.setQueryData(["/api/google-calendar/calendars"], []);
    queryClient.setQueryData(eventsQueryKey, []);
  }

  async function toggleCalendar(calendarId: string) {
    const previous = calendars;
    const next = calendars.map((calendar) =>
      calendar.id === calendarId ? { ...calendar, selected: !calendar.selected } : calendar,
    );
    queryClient.setQueryData(["/api/google-calendar/calendars"], next);
    const selectedCalendarIds = next.filter((calendar) => calendar.selected).map((calendar) => calendar.id);
    try {
      const updated = await apiJson<GoogleCalendarListItem[]>("/api/google-calendar/calendars", {
        method: "PATCH",
        body: JSON.stringify({ selectedCalendarIds }),
      });
      queryClient.setQueryData(["/api/google-calendar/calendars"], updated);
      setConnection((current) => ({ ...current, selectedCalendarIds }));
      if (range) void syncNow();
    } catch (err) {
      queryClient.setQueryData(["/api/google-calendar/calendars"], previous);
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
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => upsertEvent(current, created));
      return created;
    } catch (err) {
      handleError(err);
      return null;
    }
  }

  async function updateEvent(event: GoogleCalendarEvent, patch: GoogleCalendarEventPatch) {
    const previous = events;
    const optimistic = { ...event, ...patch };
    queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => upsertEvent(current, optimistic));
    try {
      const updated = await apiJson<GoogleCalendarEvent>(
        `/api/google-calendar/events/${encodeURIComponent(event.id)}?calendarId=${encodeURIComponent(event.calendarId)}`,
        {
          method: "PATCH",
          body: JSON.stringify(patch),
        },
      );
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => upsertEvent(current, updated));
      return updated;
    } catch (err) {
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, previous);
      handleError(err);
      return null;
    }
  }

  async function deleteEvent(event: GoogleCalendarEvent) {
    const previous = events;
    queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => 
      current.filter((item) => item.id !== event.id || item.calendarId !== event.calendarId)
    );
    try {
      await apiJson<{ ok: true }>(
        `/api/google-calendar/events/${encodeURIComponent(event.id)}?calendarId=${encodeURIComponent(event.calendarId)}`,
        { method: "DELETE" },
      );
    } catch (err) {
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, previous);
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
    syncNow,
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
