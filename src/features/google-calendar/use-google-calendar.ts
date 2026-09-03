"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { accountBoundGatewayNavigationUrl, apiJson, ClientSessionChangedError } from "@/lib/api-client";
import { captureClientCacheScope, isClientCacheScopeCurrent } from "@/lib/client-cache";
import { createSerializedMutationQueue } from "@/lib/serialized-mutation";
import { useApiState } from "@/lib/use-api-state";
import type {
  GoogleCalendarConnectionStatus,
  GoogleCalendarEvent,
  GoogleCalendarEventDraft,
  GoogleCalendarEventPatch,
  GoogleCalendarListItem,
} from "./types";
import { buildGoogleEventPatch } from "./event-mutation";

type EventRange = { start: string; end: string };

const DEFAULT_CONNECTION: GoogleCalendarConnectionStatus = {
  connected: false,
  connections: [],
};

export type UseGoogleCalendarResult = ReturnType<typeof useGoogleCalendar>;

export function useGoogleCalendar() {
  const queryClient = useQueryClient();
  const [eventMutationQueue] = useState(() => {
    const scope = captureClientCacheScope();
    return createSerializedMutationQueue({
      isActive: () => Boolean(scope.subject && isClientCacheScopeCurrent(scope)),
      inactiveError: () => new ClientSessionChangedError(),
    });
  });
  const {
    data: connection,
    setData: setConnection,
    loading: connectionLoading,
    error: connectionError,
    reload: reloadConnection,
  } = useApiState<GoogleCalendarConnectionStatus>(
    "/api/v1/google-calendar/connections",
    DEFAULT_CONNECTION,
  );
  
  const [range, setRange] = useState<EventRange | null>(null);
  const [error, setError] = useState<string | null>(null);
  const healthyConnections = useMemo(
    () => connection.connections.filter((item) => item.connected && !item.reconnectRequired),
    [connection.connections],
  );

  useEffect(() => {
    eventMutationQueue.activate();
    return () => eventMutationQueue.dispose();
  }, [eventMutationQueue]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("googleCalendar") === "connected") {
        void queryClient.invalidateQueries({ queryKey: ["/api/v1/google-calendar/connections"] });
        url.searchParams.delete("googleCalendar");
        window.history.replaceState({}, "", url.toString());
      }
    }
  }, [queryClient]);

  const handleError = useCallback((err: unknown) => {
    const message = extractErrorMessage(err);
    if (message.toLowerCase().includes("reconnect")) {
      void reloadConnection();
      setError(message);
    } else {
      setError(message);
    }
  }, [reloadConnection]);

  const { data: calendarsData, isLoading: calendarsLoading, refetch: loadCalendars } = useQuery({
    queryKey: ["/api/v1/google-calendar/calendars"],
    queryFn: async () => {
      try {
        return await apiJson<GoogleCalendarListItem[]>("/api/v1/google-calendar/calendars");
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    enabled: connection.connected,
  });
  const calendars = calendarsData || [];

  const paramsString = range ? new URLSearchParams(range).toString() : "";
  const eventsQueryKey = ["/api/v1/google-calendar/events", paramsString];

  const { data: eventsData, isFetching: syncing, refetch: syncNow } = useQuery({
    queryKey: eventsQueryKey,
    queryFn: async () => {
      try {
        const syncedEvents = await apiJson<GoogleCalendarEvent[]>(`/api/v1/google-calendar/events?${paramsString}`);
        void queryClient.invalidateQueries({ queryKey: ["/api/v1/todos"] });
        return syncedEvents;
      } catch (err) {
        handleError(err);
        throw err;
      }
    },
    enabled: !!range && connection.connected,
  });
  const events = eventsData || [];

  useEffect(() => {
    if (!range || !connection.connected) return;
    const intervalMinutes = healthyConnections.reduce(
      (min, item) => Math.min(min, item.syncIntervalMinutes || 5),
      5,
    );
    const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;
    const interval = window.setInterval(() => {
      if (document.hidden) return;
      void syncNow();
    }, intervalMs);
    return () => window.clearInterval(interval);
  }, [connection.connected, healthyConnections, range, syncNow]);

  function connect() {
    try {
      window.location.assign(accountBoundGatewayNavigationUrl("/api/v1/google-calendar/connect"));
    } catch (error) {
      if (!(error instanceof ClientSessionChangedError)) throw error;
    }
  }

  async function disconnect(connectionId?: string) {
    setError(null);
    const url = connectionId
      ? `/api/v1/google-calendar/connections?connectionId=${encodeURIComponent(connectionId)}`
      : "/api/v1/google-calendar/connections";
    const next = await apiJson<GoogleCalendarConnectionStatus>(url, { method: "DELETE" });
    setConnection(next);
    if (connectionId) {
      queryClient.setQueryData<GoogleCalendarListItem[]>(["/api/v1/google-calendar/calendars"], (current = []) =>
        current.filter((calendar) => calendar.connectionId !== connectionId),
      );
      queryClient.setQueriesData<GoogleCalendarEvent[]>(
        { queryKey: ["/api/v1/google-calendar/events"] },
        (current = []) => current.filter((event) => event.connectionId !== connectionId),
      );
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/google-calendar/calendars"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/v1/google-calendar/events"] });
    } else {
      queryClient.setQueryData(["/api/v1/google-calendar/calendars"], []);
      queryClient.setQueriesData({ queryKey: ["/api/v1/google-calendar/events"] }, []);
    }
  }

  async function toggleCalendar(connectionId: string, calendarId: string) {
    const previous = calendars;
    const next = calendars.map((calendar) =>
      calendar.connectionId === connectionId && calendar.id === calendarId
        ? { ...calendar, selected: !calendar.selected }
        : calendar,
    );
    queryClient.setQueryData(["/api/v1/google-calendar/calendars"], next);
    const selectedCalendarIds = next
      .filter((calendar) => calendar.connectionId === connectionId && calendar.selected)
      .map((calendar) => calendar.id);
    try {
      const updated = await apiJson<GoogleCalendarListItem[]>("/api/v1/google-calendar/calendars", {
        method: "PATCH",
        body: JSON.stringify({ connectionId, selectedCalendarIds }),
      });
      queryClient.setQueryData(["/api/v1/google-calendar/calendars"], updated);
      setConnection((current) => ({
        ...current,
        connections: current.connections.map((connection) =>
          connection.id === connectionId ? { ...connection, selectedCalendarIds } : connection,
        ),
      }));
      if (range) void syncNow();
    } catch (err) {
      if (err instanceof ClientSessionChangedError) return;
      queryClient.setQueryData(["/api/v1/google-calendar/calendars"], previous);
      handleError(err);
    }
  }

  async function createEvent(draft: GoogleCalendarEventDraft) {
    setError(null);
    try {
      const created = await apiJson<GoogleCalendarEvent>("/api/v1/google-calendar/events", {
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
    const desired = buildGoogleEventPatch(event, patch);
    try {
      const updated = await eventMutationQueue.enqueue(() => apiJson<GoogleCalendarEvent>(
          `/api/v1/google-calendar/events/${encodeURIComponent(event.id)}?connectionId=${encodeURIComponent(event.connectionId)}&calendarId=${encodeURIComponent(event.calendarId)}`,
          {
            method: "PATCH",
            body: JSON.stringify(desired),
          },
        ));
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => upsertEvent(current, updated));
      return updated;
    } catch (err) {
      if (err instanceof ClientSessionChangedError) return null;
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/google-calendar/events"] });
      handleError(err);
      return null;
    }
  }

  async function deleteEvent(event: GoogleCalendarEvent) {
    queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) => 
      current.filter((item) =>
        item.id !== event.id ||
        item.googleAccountId !== event.googleAccountId ||
        item.calendarId !== event.calendarId
      )
    );
    try {
      await eventMutationQueue.enqueue(() => apiJson<{ ok: true }>(
          `/api/v1/google-calendar/events/${encodeURIComponent(event.id)}?connectionId=${encodeURIComponent(event.connectionId)}&calendarId=${encodeURIComponent(event.calendarId)}`,
          { method: "DELETE" },
        ));
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) =>
        current.filter((item) =>
          item.id !== event.id ||
          item.googleAccountId !== event.googleAccountId ||
          item.calendarId !== event.calendarId
        ),
      );
    } catch (err) {
      if (err instanceof ClientSessionChangedError) return;
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/google-calendar/events"] });
      handleError(err);
    }
  }

  async function convertEventToTask(event: GoogleCalendarEvent) {
    try {
      const converted = await eventMutationQueue.enqueue(() => apiJson<{ id: string }>(
          `/api/v1/google-calendar/events/${encodeURIComponent(event.id)}/convert-to-task?connectionId=${encodeURIComponent(event.connectionId)}&calendarId=${encodeURIComponent(event.calendarId)}`,
          { method: "POST" },
        ));
      await queryClient.invalidateQueries({ queryKey: ["/api/v1/todos"] });
      queryClient.setQueryData<GoogleCalendarEvent[]>(eventsQueryKey, (current = []) =>
        current.filter((item) =>
          item.id !== event.id ||
          item.googleAccountId !== event.googleAccountId ||
          item.calendarId !== event.calendarId
        ),
      );
      return converted;
    } catch (err) {
      handleError(err);
      return null;
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
    convertEventToTask,
  };
}

function upsertEvent(events: GoogleCalendarEvent[], event: GoogleCalendarEvent) {
  const exists = events.some((item) =>
    item.id === event.id &&
    item.googleAccountId === event.googleAccountId &&
    item.calendarId === event.calendarId
  );
  if (!exists) return [...events, event].sort((a, b) => a.start.localeCompare(b.start));
  return events
    .map((item) => (
      item.id === event.id &&
      item.googleAccountId === event.googleAccountId &&
      item.calendarId === event.calendarId
        ? event
        : item
    ))
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
