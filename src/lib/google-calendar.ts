import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { googleCalendarConnections, googleCalendarEventCache, todos } from "@/db/schema";
import { createId } from "./id";

const TOKEN_VERSION = "v1";
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export const GOOGLE_CALENDAR_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
];

export type GoogleCalendarConnection = {
  id: string;
  googleAccountId: string;
  connected: boolean;
  googleEmail: string;
  selectedCalendarIds: string[];
  syncIntervalMinutes: number;
  reconnectRequired: boolean;
};

export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  connections: GoogleCalendarConnection[];
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
  connectionId?: string;
  calendarId?: string;
  title?: string;
  description?: string;
  location?: string;
  start?: string;
  end?: string;
  allDay?: boolean;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleUserInfo = {
  id?: string;
  email?: string;
};

type CalendarListResponse = {
  items?: Array<{
    id?: string;
    summary?: string;
    primary?: boolean;
    backgroundColor?: string;
    accessRole?: string;
  }>;
};

type EventsResponse = {
  items?: GoogleCalendarApiEvent[];
};

type GoogleCalendarApiEvent = {
  id?: string;
  etag?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  updated?: string;
  htmlLink?: string;
  status?: string;
};

type CalendarConnectionRow = typeof googleCalendarConnections.$inferSelect;
type CalendarCacheRow = typeof googleCalendarEventCache.$inferSelect;

export class GoogleCalendarApiError extends Error {
  status: number;
  reconnectRequired: boolean;

  constructor(message: string, status = 500, reconnectRequired = false) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
    this.reconnectRequired = reconnectRequired;
  }
}

export function getGoogleCalendarConfig(requestUrl?: URL) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google Calendar integration");
  }

  const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const fallbackRedirect = requestUrl
    ? new URL("/api/auth/google/callback", requestUrl.origin).toString()
    : `${baseUrl}/api/auth/google/callback`;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? fallbackRedirect;

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: GOOGLE_CALENDAR_SCOPES,
  };
}

export function createGoogleOAuthState(userId: string) {
  const payload = {
    userId,
    nonce: randomBytes(12).toString("base64url"),
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = signState(encoded);
  return `${encoded}.${signature}`;
}

export function verifyGoogleOAuthState(state: string | null, userId: string) {
  if (!state) return false;
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return false;
  const expected = signState(encoded);
  if (!safeEqual(signature, expected)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      userId?: string;
      expiresAt?: number;
    };
    return payload.userId === userId && typeof payload.expiresAt === "number" && payload.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function googleCalendarError(message: string, status = 503) {
  return NextResponse.json({ error: message }, { status });
}

export function googleCalendarApiErrorResponse(error: unknown) {
  if (error instanceof GoogleCalendarApiError) {
    return NextResponse.json(
      { error: error.message, reconnectRequired: error.reconnectRequired },
      { status: error.status },
    );
  }
  console.error("[personal-tracker] Google Calendar API error", error);
  return NextResponse.json({ error: "Google Calendar request failed" }, { status: 500 });
}

export async function buildGoogleAuthorizationRedirect(request: NextRequest, userId: string) {
  const config = getGoogleCalendarConfig(request.nextUrl);
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", config.scopes.join(" "));
  authorizeUrl.searchParams.set("access_type", "offline");
  authorizeUrl.searchParams.set("prompt", "consent");
  authorizeUrl.searchParams.set("include_granted_scopes", "true");
  authorizeUrl.searchParams.set("state", createGoogleOAuthState(userId));
  return NextResponse.redirect(authorizeUrl);
}

export async function storeGoogleCalendarConnection(request: NextRequest, userId: string, code: string) {
  const config = getGoogleCalendarConfig(request.nextUrl);
  const tokenResponse = await exchangeAuthorizationCode(code, config);
  if (!tokenResponse.access_token) {
    throw new Error(tokenResponse.error_description ?? tokenResponse.error ?? "Google did not return an access token");
  }

  const profile = await fetchGoogleProfile(tokenResponse.access_token);
  const googleEmail = profile.email ?? "Google Calendar";
  const googleAccountId = profile.id ?? googleEmail;
  const existing = await adoptLegacyGoogleCalendarAccountIdentity(userId, googleAccountId, googleEmail);
  if (!tokenResponse.refresh_token && !existing?.refreshToken) {
    throw new Error(tokenResponse.error_description ?? tokenResponse.error ?? "Google did not return a refresh token");
  }

  const expiresInSeconds = tokenResponse.expires_in ?? 3600;
  const selectedCalendarIds = existing?.selectedCalendarIds ?? JSON.stringify([defaultSelectedGoogleCalendarId(googleEmail)]);
  const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const now = new Date();
  const id = existing?.id ?? createId();

  await db
    .insert(googleCalendarConnections)
    .values({
      id,
      userId,
      googleAccountId,
      googleEmail,
      accessToken: encryptToken(tokenResponse.access_token),
      refreshToken: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : existing!.refreshToken,
      tokenExpiresAt,
      scope: tokenResponse.scope ?? config.scopes.join(" "),
      selectedCalendarIds,
      syncIntervalMinutes: existing?.syncIntervalMinutes ?? 5,
      reconnectRequired: false,
      connectedAt: existing?.connectedAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [googleCalendarConnections.userId, googleCalendarConnections.googleAccountId],
      set: {
        googleEmail,
        accessToken: encryptToken(tokenResponse.access_token),
        refreshToken: tokenResponse.refresh_token ? encryptToken(tokenResponse.refresh_token) : existing!.refreshToken,
        tokenExpiresAt,
        scope: tokenResponse.scope ?? config.scopes.join(" "),
        selectedCalendarIds,
        reconnectRequired: false,
        updatedAt: now,
      },
    });
  await adoptLegacyGoogleLinkedRows(userId, id, googleAccountId, googleEmail);

  return getGoogleCalendarConnectionStatus(userId);
}

export async function getGoogleCalendarConnectionStatus(userId: string): Promise<GoogleCalendarConnectionStatus> {
  const connections = await db
    .select({
      id: googleCalendarConnections.id,
      googleAccountId: googleCalendarConnections.googleAccountId,
      googleEmail: googleCalendarConnections.googleEmail,
      selectedCalendarIds: googleCalendarConnections.selectedCalendarIds,
      syncIntervalMinutes: googleCalendarConnections.syncIntervalMinutes,
      reconnectRequired: googleCalendarConnections.reconnectRequired,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId));

  const mapped = connections.map((connection) => ({
    id: connection.id,
    googleAccountId: connection.googleAccountId,
    connected: !connection.reconnectRequired,
    googleEmail: connection.googleEmail,
    selectedCalendarIds: parseSelectedCalendarIds(connection.selectedCalendarIds),
    syncIntervalMinutes: connection.syncIntervalMinutes,
    reconnectRequired: connection.reconnectRequired,
  }));

  return {
    connected: mapped.some((connection) => connection.connected),
    connections: mapped,
  };
}

export async function disconnectGoogleCalendar(userId: string, connectionId?: string) {
  if (connectionId) {
    await db
      .delete(googleCalendarEventCache)
      .where(and(eq(googleCalendarEventCache.userId, userId), eq(googleCalendarEventCache.connectionId, connectionId)));
    await db
      .delete(googleCalendarConnections)
      .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, connectionId)));
  } else {
    await db.delete(googleCalendarEventCache).where(eq(googleCalendarEventCache.userId, userId));
    await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
  }
  return getGoogleCalendarConnectionStatus(userId);
}

export async function listGoogleCalendars(userId: string, connectionId?: string): Promise<GoogleCalendarListItem[]> {
  const connections = connectionId
    ? [await ensureGoogleCalendarConnection(userId, connectionId)]
    : await getHealthyGoogleCalendarConnections(userId);
  const calendars: GoogleCalendarListItem[] = [];
  for (const connection of connections) {
    const selectedCalendarIds = new Set(
      parseSelectedCalendarIds(connection.selectedCalendarIds).flatMap((calendarId) =>
        googleCalendarIdAliases(connection, calendarId),
      ),
    );
    const response = await googleCalendarFetch<CalendarListResponse>(connection, "/users/me/calendarList");
    calendars.push(
      ...(response.items ?? [])
        .filter((calendar) => Boolean(calendar.id))
        .map((calendar) => ({
          connectionId: connection.id,
          googleAccountId: connection.googleAccountId,
          googleEmail: connection.googleEmail,
          id: calendar.id!,
          summary: calendar.summary ?? calendar.id!,
          primary: calendar.primary ?? false,
          backgroundColor: calendar.backgroundColor ?? null,
          accessRole: calendar.accessRole ?? "reader",
          selected: selectedCalendarIds.has(calendar.id!),
        })),
    );
  }
  return calendars;
}

export async function updateSelectedGoogleCalendars(
  userId: string,
  connectionId: string,
  selectedCalendarIds: string[],
) {
  await ensureGoogleCalendarConnection(userId, connectionId);
  await db
    .update(googleCalendarConnections)
    .set({
      selectedCalendarIds: JSON.stringify(selectedCalendarIds),
      updatedAt: new Date(),
    })
    .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, connectionId)));
  return listGoogleCalendars(userId);
}

export async function syncGoogleCalendarEvents(userId: string, range: { start: string; end: string }) {
  const connections = await getHealthyGoogleCalendarConnections(userId);
  const events: GoogleCalendarEvent[] = [];

  for (const connection of connections) {
    const calendarIds = parseSelectedCalendarIds(connection.selectedCalendarIds);
    if (!calendarIds.length) continue;

    try {
      for (const calendarId of calendarIds) {
        const params = new URLSearchParams({
          singleEvents: "true",
          orderBy: "startTime",
          showDeleted: "true",
          timeMin: toGoogleRangeStart(range.start),
          timeMax: toGoogleRangeEnd(range.end),
        });
        const response = await googleCalendarFetch<EventsResponse>(
          connection,
          `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        );

        for (const apiEvent of response.items ?? []) {
          const calendarAliases = googleCalendarIdAliases(connection, calendarId);
          if (apiEvent.status === "cancelled" && apiEvent.id) {
            await deleteCachedGoogleCalendarEvent(
              userId,
              connection.googleAccountId,
              calendarAliases,
              apiEvent.id,
            );
            await db.delete(todos).where(
              and(
                eq(todos.userId, userId),
                calendarAliases.length === 1
                  ? eq(todos.googleCalendarId, calendarAliases[0])
                  : or(...calendarAliases.map((alias) => eq(todos.googleCalendarId, alias))),
                eq(todos.googleEventId, apiEvent.id),
                or(
                  eq(todos.googleCalendarAccountId, connection.googleAccountId),
                  eq(todos.googleCalendarAccountId, connection.googleEmail),
                  isNull(todos.googleCalendarAccountId),
                ),
              ),
            );
            continue;
          }

          const event = normalizeGoogleEvent(connection, calendarId, apiEvent);
          if (!event) continue;

          const localTask = await findLinkedGoogleTask(userId, connection, calendarId, event.id);

          if (localTask && localTask.syncStatus === "error") {
            const draft: GoogleCalendarEventDraft = {
              connectionId: connection.id,
              calendarId,
              title: localTask.title,
              description: localTask.description || undefined,
              location: localTask.location || undefined,
              start: localTask.startAt || localTask.dueDate || undefined,
              end: localTask.endAt || undefined,
              allDay: localTask.allDay,
            };
            try {
              const updatedEvent = await updateGoogleCalendarEvent(userId, connection.id, calendarId, event.id, draft);
              await db
                .update(todos)
                .set({
                  syncStatus: "synced",
                  googleEventPayload: { etag: updatedEvent.etag, updated: updatedEvent.updated },
                  googleCalendarConnectionId: connection.id,
                  googleCalendarAccountId: connection.googleAccountId,
                  googleCalendarId: updatedEvent.calendarId,
                })
                .where(eq(todos.id, localTask.id));
              await upsertCachedEvent(userId, updatedEvent, { localUpdatedAt: new Date(), pendingLocalUpdate: false });
            } catch {
              await reconcileFetchedEvent(userId, event);
            }
            continue;
          }

          const reconciled = await reconcileFetchedEvent(userId, event);
          if (localTask) {
            await db
              .update(todos)
              .set({
                title: reconciled.title,
                description: reconciled.description,
                location: reconciled.location,
                startAt: reconciled.start,
                dueDate: reconciled.allDay ? reconciled.start.slice(0, 10) : reconciled.start,
                endAt: reconciled.end || null,
                allDay: reconciled.allDay,
                googleCalendarConnectionId: connection.id,
                googleCalendarAccountId: connection.googleAccountId,
                googleCalendarId: reconciled.calendarId,
                googleEventPayload: { etag: reconciled.etag, updated: reconciled.updated },
                syncStatus: "synced",
              })
              .where(eq(todos.id, localTask.id));
            continue;
          }
          upsertVisibleGoogleEvent(events, reconciled);
        }
      }

      await db
        .update(googleCalendarConnections)
        .set({ lastSyncedAt: new Date(), reconnectRequired: false, updatedAt: new Date() })
        .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, connection.id)));
    } catch (error) {
      if (error instanceof GoogleCalendarApiError && error.reconnectRequired) continue;
      console.error("[personal-tracker] Google Calendar sync failed", error);
    }
  }

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

function upsertVisibleGoogleEvent(events: GoogleCalendarEvent[], event: GoogleCalendarEvent) {
  const existingIndex = events.findIndex(
    (item) =>
      item.googleAccountId === event.googleAccountId &&
      item.calendarId === event.calendarId &&
      item.id === event.id,
  );
  if (existingIndex === -1) {
    events.push(event);
  } else {
    events[existingIndex] = event;
  }
}

export async function createGoogleCalendarEvent(userId: string, draft: GoogleCalendarEventDraft) {
  const calendarId = draft.calendarId;
  const connectionId = draft.connectionId;
  if (!connectionId || !calendarId) {
    throw new GoogleCalendarApiError("Choose an enabled Google Calendar", 400);
  }
  const connection = await ensureGoogleCalendarConnection(userId, connectionId);
  const selectedCalendarIds = parseSelectedCalendarIds(connection.selectedCalendarIds);
  if (!selectedCalendarIds.includes(calendarId)) {
    throw new GoogleCalendarApiError("Choose an enabled Google Calendar", 400);
  }

  const response = await googleCalendarFetch<GoogleCalendarApiEvent>(
    connection,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify(toGoogleEventPayload(draft)),
    },
  );
  const event = normalizeGoogleEvent(connection, calendarId, response);
  if (!event) throw new GoogleCalendarApiError("Google returned an invalid event", 502);
  await upsertCachedEvent(userId, event, { localUpdatedAt: new Date(), pendingLocalUpdate: false });
  return event;
}

export async function updateGoogleCalendarEvent(
  userId: string,
  connectionId: string,
  calendarId: string,
  eventId: string,
  patch: GoogleCalendarEventDraft,
) {
  const connection = await ensureGoogleCalendarConnection(userId, connectionId);
  const response = await googleCalendarFetch<GoogleCalendarApiEvent>(
    connection,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(toGoogleEventPayload(patch)),
    },
  );
  const event = normalizeGoogleEvent(connection, calendarId, response);
  if (!event) throw new GoogleCalendarApiError("Google returned an invalid event", 502);
  await upsertCachedEvent(userId, event, { localUpdatedAt: new Date(), pendingLocalUpdate: true });
  return event;
}

export async function deleteGoogleCalendarEvent(
  userId: string,
  connectionId: string,
  calendarId: string,
  eventId: string,
) {
  const connection = await ensureGoogleCalendarConnection(userId, connectionId);
  await googleCalendarFetch<void>(
    connection,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  await deleteCachedGoogleCalendarEvent(
    userId,
    connection.googleAccountId,
    googleCalendarIdAliases(connection, calendarId),
    eventId,
  );
  return { ok: true };
}

export async function deleteGoogleCalendarEventByAccount(
  userId: string,
  googleAccountIdentity: string,
  calendarId: string,
  eventId: string,
) {
  const connection = await ensureGoogleCalendarConnectionByAccount(userId, googleAccountIdentity);
  await googleCalendarFetch<void>(
    connection,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  await deleteCachedGoogleCalendarEvent(
    userId,
    connection.googleAccountId,
    googleCalendarIdAliases(connection, calendarId),
    eventId,
  );
  return { ok: true };
}

export async function markGoogleCalendarReconnectRequired(userId: string, connectionId: string) {
  await db
    .update(googleCalendarConnections)
    .set({ reconnectRequired: true, updatedAt: new Date() })
    .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, connectionId)));
}

export function parseSelectedCalendarIds(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mergeGoogleCalendarConnectionSettings(
  candidates: CalendarConnectionRow[],
  target: CalendarConnectionRow,
  googleEmail: string,
) {
  const selectedCalendarIds = Array.from(
    new Set(
      candidates.flatMap((connection) =>
        parseSelectedCalendarIds(connection.selectedCalendarIds).map((calendarId) =>
          canonicalGoogleCalendarId({ googleEmail }, calendarId),
        ),
      ),
    ),
  );
  const syncIntervalMinutes = target.syncIntervalMinutes !== 5
    ? target.syncIntervalMinutes
    : candidates.find((connection) => connection.syncIntervalMinutes !== 5)?.syncIntervalMinutes ?? target.syncIntervalMinutes;

  return {
    selectedCalendarIds: JSON.stringify(selectedCalendarIds.length > 0 ? selectedCalendarIds : ["primary"]),
    syncIntervalMinutes,
  };
}

function hasGoogleEmail(googleEmail: string | null | undefined) {
  return Boolean(googleEmail && googleEmail !== "Google Calendar");
}

function defaultSelectedGoogleCalendarId(googleEmail: string) {
  return hasGoogleEmail(googleEmail) ? googleEmail : "primary";
}

function canonicalGoogleCalendarId(
  connection: Pick<CalendarConnectionRow, "googleEmail">,
  calendarId: string,
) {
  return calendarId === "primary" && hasGoogleEmail(connection.googleEmail)
    ? connection.googleEmail
    : calendarId;
}

function googleCalendarIdAliases(
  connection: Pick<CalendarConnectionRow, "googleEmail">,
  calendarId: string,
) {
  const aliases = [calendarId];
  if (hasGoogleEmail(connection.googleEmail)) {
    if (calendarId === "primary") aliases.push(connection.googleEmail);
    if (calendarId === connection.googleEmail) aliases.push("primary");
  }
  return Array.from(new Set(aliases));
}

export function encryptedTokenForTestOnly(value: string) {
  return encryptToken(value);
}

export function decryptGoogleCalendarToken(value: string) {
  return decryptToken(value);
}

export async function deleteCachedGoogleCalendarEvent(
  userId: string,
  googleAccountId: string,
  calendarId: string | string[],
  googleEventId: string,
) {
  const calendarIds = Array.isArray(calendarId) ? calendarId : [calendarId];
  await db
    .delete(googleCalendarEventCache)
    .where(
      and(
        eq(googleCalendarEventCache.userId, userId),
        eq(googleCalendarEventCache.googleAccountId, googleAccountId),
        calendarIds.length === 1
          ? eq(googleCalendarEventCache.calendarId, calendarIds[0])
          : or(...calendarIds.map((id) => eq(googleCalendarEventCache.calendarId, id))),
        eq(googleCalendarEventCache.googleEventId, googleEventId),
      ),
    );
}

async function getHealthyGoogleCalendarConnections(userId: string) {
  return db
    .select()
    .from(googleCalendarConnections)
    .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.reconnectRequired, false)));
}

async function adoptLegacyGoogleCalendarAccountIdentity(userId: string, googleAccountId: string, googleEmail: string) {
  return db.transaction(async (tx) => {
    const identityFilters = [eq(googleCalendarConnections.googleAccountId, googleAccountId)];
    if (googleEmail && googleEmail !== "Google Calendar" && googleEmail !== googleAccountId) {
      identityFilters.push(eq(googleCalendarConnections.googleAccountId, googleEmail));
      identityFilters.push(eq(googleCalendarConnections.googleEmail, googleEmail));
    }

    const candidates = await tx
      .select()
      .from(googleCalendarConnections)
      .where(and(eq(googleCalendarConnections.userId, userId), or(...identityFilters)))
      .orderBy(asc(googleCalendarConnections.connectedAt));
    const canonical = candidates.find((connection) => connection.googleAccountId === googleAccountId);
    const target = canonical ?? candidates[0] ?? null;
    if (!target) return null;
    const mergedSettings = mergeGoogleCalendarConnectionSettings(candidates, target, googleEmail);

    for (const legacy of candidates) {
      if (legacy.id === target.id) continue;
      await moveGoogleLinkedRows(tx, userId, legacy.id, legacy.googleAccountId, target.id, googleAccountId);
      await tx
        .delete(googleCalendarConnections)
        .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, legacy.id)));
    }

    const needsIdentityUpdate = target.googleAccountId !== googleAccountId || target.googleEmail !== googleEmail;
    const needsSettingsUpdate =
      target.selectedCalendarIds !== mergedSettings.selectedCalendarIds ||
      target.syncIntervalMinutes !== mergedSettings.syncIntervalMinutes;

    if (needsIdentityUpdate || needsSettingsUpdate) {
      if (needsIdentityUpdate) {
        await moveGoogleLinkedRows(tx, userId, target.id, target.googleAccountId, target.id, googleAccountId);
      }
      const [updated] = await tx
        .update(googleCalendarConnections)
        .set({
          googleAccountId,
          googleEmail,
          selectedCalendarIds: mergedSettings.selectedCalendarIds,
          syncIntervalMinutes: mergedSettings.syncIntervalMinutes,
          updatedAt: new Date(),
        })
        .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, target.id)))
        .returning();
      return updated ?? target;
    }

    return target;
  });
}

async function moveGoogleLinkedRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  userId: string,
  fromConnectionId: string,
  fromAccountId: string,
  toConnectionId: string,
  toAccountId: string,
) {
  await tx.execute(sql`
    DELETE FROM "todos" AS legacy
    WHERE legacy."user_id" = ${userId}
      AND legacy."google_calendar_id" IS NOT NULL
      AND legacy."google_event_id" IS NOT NULL
      AND (
        legacy."google_calendar_connection_id" = ${fromConnectionId}
        OR legacy."google_calendar_account_id" = ${fromAccountId}
      )
      AND EXISTS (
        SELECT 1
        FROM "todos" AS canonical
        WHERE canonical."user_id" = legacy."user_id"
          AND canonical."google_calendar_account_id" = ${toAccountId}
          AND canonical."google_calendar_id" = legacy."google_calendar_id"
          AND canonical."google_event_id" = legacy."google_event_id"
          AND canonical."id" <> legacy."id"
      )
  `);
  await tx.execute(sql`
    UPDATE "todos"
    SET
      "google_calendar_connection_id" = ${toConnectionId},
      "google_calendar_account_id" = ${toAccountId}
    WHERE "user_id" = ${userId}
      AND (
        "google_calendar_connection_id" = ${fromConnectionId}
        OR "google_calendar_account_id" = ${fromAccountId}
      )
  `);
  await tx.execute(sql`
    DELETE FROM "google_calendar_event_cache" AS legacy
    WHERE legacy."user_id" = ${userId}
      AND (
        legacy."google_calendar_connection_id" = ${fromConnectionId}
        OR legacy."google_account_id" = ${fromAccountId}
      )
      AND EXISTS (
        SELECT 1
        FROM "google_calendar_event_cache" AS canonical
        WHERE canonical."user_id" = legacy."user_id"
          AND canonical."google_account_id" = ${toAccountId}
          AND canonical."calendar_id" = legacy."calendar_id"
          AND canonical."google_event_id" = legacy."google_event_id"
          AND canonical."id" <> legacy."id"
      )
  `);
  await tx.execute(sql`
    UPDATE "google_calendar_event_cache"
    SET
      "google_calendar_connection_id" = ${toConnectionId},
      "google_account_id" = ${toAccountId}
    WHERE "user_id" = ${userId}
      AND (
        "google_calendar_connection_id" = ${fromConnectionId}
        OR "google_account_id" = ${fromAccountId}
      )
  `);
}

async function adoptLegacyGoogleLinkedRows(
  userId: string,
  connectionId: string,
  googleAccountId: string,
  googleEmail: string,
) {
  if (!googleEmail || googleEmail === "Google Calendar" || googleEmail === googleAccountId) return;
  await db.transaction(async (tx) => {
    await moveGoogleLinkedRows(tx, userId, "", googleEmail, connectionId, googleAccountId);
  });
}

async function findLinkedGoogleTask(
  userId: string,
  connection: CalendarConnectionRow,
  calendarId: string,
  googleEventId: string,
) {
  return db.transaction(async (tx) => {
    const calendarAliases = googleCalendarIdAliases(connection, calendarId);
    const accountFilter = or(
      eq(todos.googleCalendarAccountId, connection.googleAccountId),
      eq(todos.googleCalendarAccountId, connection.googleEmail),
      isNull(todos.googleCalendarAccountId),
    );
    const matches = await tx
      .select()
      .from(todos)
      .where(
        and(
          eq(todos.userId, userId),
          calendarAliases.length === 1
            ? eq(todos.googleCalendarId, calendarAliases[0])
            : or(...calendarAliases.map((alias) => eq(todos.googleCalendarId, alias))),
          eq(todos.googleEventId, googleEventId),
          accountFilter,
        ),
      )
      .orderBy(asc(todos.createdAt));
    const canonical = matches[0];
    if (!canonical) return null;

    for (const duplicate of matches.slice(1)) {
      await tx.delete(todos).where(and(eq(todos.userId, userId), eq(todos.id, duplicate.id)));
    }

    const [adopted] = await tx
      .update(todos)
      .set({
        googleCalendarConnectionId: connection.id,
        googleCalendarAccountId: connection.googleAccountId,
        googleCalendarId: canonicalGoogleCalendarId(connection, calendarId),
        source: "google",
        syncStatus: canonical.syncStatus === "local_only" ? "synced" : canonical.syncStatus,
      })
      .where(and(eq(todos.userId, userId), eq(todos.id, canonical.id)))
      .returning();
    return adopted ?? canonical;
  });
}

async function ensureGoogleCalendarConnection(userId: string, connectionId: string) {
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(and(eq(googleCalendarConnections.userId, userId), eq(googleCalendarConnections.id, connectionId)))
    .limit(1);
  if (!connection) {
    throw new GoogleCalendarApiError("Google Calendar is not connected", 404);
  }
  if (connection.reconnectRequired) {
    throw new GoogleCalendarApiError("Reconnect Google Calendar", 401, true);
  }
  return connection;
}

async function ensureGoogleCalendarConnectionByAccount(userId: string, googleAccountIdentity: string) {
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(
      and(
        eq(googleCalendarConnections.userId, userId),
        or(
          eq(googleCalendarConnections.googleAccountId, googleAccountIdentity),
          eq(googleCalendarConnections.googleEmail, googleAccountIdentity),
        ),
      ),
    )
    .orderBy(asc(googleCalendarConnections.reconnectRequired), asc(googleCalendarConnections.connectedAt))
    .limit(1);
  if (!connection) {
    throw new GoogleCalendarApiError("Google Calendar is not connected", 404);
  }
  if (connection.reconnectRequired) {
    throw new GoogleCalendarApiError("Reconnect Google Calendar", 401, true);
  }
  return connection;
}

async function googleCalendarFetch<T>(connection: CalendarConnectionRow, path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getValidGoogleAccessToken(connection);
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 401) {
    await markGoogleCalendarReconnectRequired(connection.userId, connection.id);
    throw new GoogleCalendarApiError("Reconnect Google Calendar", 401, true);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : `Google Calendar request failed with ${response.status}`;
    throw new GoogleCalendarApiError(message, response.status);
  }
  return body as T;
}

async function getValidGoogleAccessToken(connection: CalendarConnectionRow) {
  if (connection.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decryptToken(connection.accessToken);
  }
  return refreshGoogleAccessToken(connection);
}

async function refreshGoogleAccessToken(connection: CalendarConnectionRow) {
  const config = getGoogleCalendarConfig();
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: decryptToken(connection.refreshToken),
      grant_type: "refresh_token",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as TokenResponse;
  if (!response.ok || !body.access_token) {
    await markGoogleCalendarReconnectRequired(connection.userId, connection.id);
    throw new GoogleCalendarApiError("Reconnect Google Calendar", 401, true);
  }

  const refreshToken = body.refresh_token ? encryptToken(body.refresh_token) : connection.refreshToken;
  await db
    .update(googleCalendarConnections)
    .set({
      accessToken: encryptToken(body.access_token),
      refreshToken,
      tokenExpiresAt: new Date(Date.now() + (body.expires_in ?? 3600) * 1000),
      scope: body.scope ?? connection.scope,
      reconnectRequired: false,
      updatedAt: new Date(),
    })
    .where(and(eq(googleCalendarConnections.userId, connection.userId), eq(googleCalendarConnections.id, connection.id)));

  return body.access_token;
}

async function reconcileFetchedEvent(userId: string, event: GoogleCalendarEvent) {
  const cached = await getCachedEvent(userId, event.googleAccountId, event.calendarId, event.id);
  if (cached?.pendingLocalUpdate && !cached.deleted) {
    const pushed = await pushCachedEventToGoogle(userId, { ...cached, connectionId: event.connectionId });
    await upsertCachedEvent(userId, pushed, { localUpdatedAt: cached.localUpdatedAt, pendingLocalUpdate: false });
    return pushed;
  }
  await upsertCachedEvent(userId, event, {
    localUpdatedAt: cached?.localUpdatedAt ?? null,
    pendingLocalUpdate: false,
  });
  return event;
}

async function pushCachedEventToGoogle(userId: string, cached: CalendarCacheRow) {
  const response = await updateGoogleCalendarEvent(
    userId,
    cached.connectionId,
    cached.calendarId,
    cached.googleEventId,
    {
      connectionId: cached.connectionId,
      calendarId: cached.calendarId,
      title: cached.title,
      description: cached.description,
      location: cached.location,
      start: cached.start,
      end: cached.end,
      allDay: cached.allDay,
    },
  );
  return response;
}

async function getCachedEvent(userId: string, googleAccountId: string, calendarId: string, googleEventId: string) {
  const [cached] = await db
    .select()
    .from(googleCalendarEventCache)
    .where(
      and(
        eq(googleCalendarEventCache.userId, userId),
        eq(googleCalendarEventCache.googleAccountId, googleAccountId),
        eq(googleCalendarEventCache.calendarId, calendarId),
        eq(googleCalendarEventCache.googleEventId, googleEventId),
      ),
    )
    .limit(1);
  return cached ?? null;
}

async function upsertCachedEvent(
  userId: string,
  event: GoogleCalendarEvent,
  opts: { localUpdatedAt?: Date | null; pendingLocalUpdate?: boolean } = {},
) {
  const googleUpdatedAt = event.updated ? new Date(event.updated) : null;
  await db
    .insert(googleCalendarEventCache)
    .values({
      id: createId(),
      userId,
      connectionId: event.connectionId,
      googleAccountId: event.googleAccountId,
      calendarId: event.calendarId,
      googleEventId: event.id,
      etag: event.etag,
      title: event.title,
      description: event.description,
      location: event.location,
      start: event.start,
      end: event.end,
      allDay: event.allDay,
      googleUpdatedAt,
      localUpdatedAt: opts.localUpdatedAt ?? null,
      pendingLocalUpdate: opts.pendingLocalUpdate ?? false,
      deleted: false,
    })
    .onConflictDoUpdate({
      target: [
        googleCalendarEventCache.userId,
        googleCalendarEventCache.googleAccountId,
        googleCalendarEventCache.calendarId,
        googleCalendarEventCache.googleEventId,
      ],
      set: {
        connectionId: event.connectionId,
        etag: event.etag,
        title: event.title,
        description: event.description,
        location: event.location,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        googleUpdatedAt,
        localUpdatedAt: opts.localUpdatedAt ?? null,
        pendingLocalUpdate: opts.pendingLocalUpdate ?? false,
        deleted: false,
      },
    });
}

function normalizeGoogleEvent(connection: CalendarConnectionRow, calendarId: string, event: GoogleCalendarApiEvent): GoogleCalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !start || !end) return null;
  return {
    connectionId: connection.id,
    googleAccountId: connection.googleAccountId,
    id: event.id,
    calendarId: canonicalGoogleCalendarId(connection, calendarId),
    title: event.summary ?? "(No title)",
    description: event.description ?? "",
    location: event.location ?? "",
    start,
    end,
    allDay: Boolean(event.start?.date && event.end?.date),
    etag: event.etag ?? null,
    htmlLink: event.htmlLink ?? null,
    updated: event.updated ?? null,
  };
}

function toGoogleEventPayload(draft: GoogleCalendarEventDraft) {
  const payload: Record<string, unknown> = {};
  if (draft.title !== undefined) payload.summary = draft.title;
  if (draft.description !== undefined) payload.description = draft.description;
  if (draft.location !== undefined) payload.location = draft.location;
  if (draft.start !== undefined) {
    payload.start = draft.allDay || isDateOnly(draft.start) ? { date: draft.start.slice(0, 10) } : { dateTime: toRfc3339(draft.start) };
  }
  if (draft.end !== undefined) {
    payload.end = draft.allDay || isDateOnly(draft.end) ? { date: draft.end.slice(0, 10) } : { dateTime: toRfc3339(draft.end) };
  }
  return payload;
}

function toGoogleRangeStart(value: string) {
  return `${value.slice(0, 10)}T00:00:00.000Z`;
}

function toGoogleRangeEnd(value: string) {
  return `${value.slice(0, 10)}T23:59:59.999Z`;
}

function toRfc3339(value: string) {
  if (isDateOnly(value)) return `${value}T00:00:00.000Z`;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function isDateOnly(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function exchangeAuthorizationCode(
  code: string,
  config: ReturnType<typeof getGoogleCalendarConfig>,
): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  const body = (await response.json()) as TokenResponse;
  if (!response.ok) {
    throw new Error(body.error_description ?? body.error ?? "Google OAuth token exchange failed");
  }
  return body;
}

async function fetchGoogleProfile(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return { email: "Google Calendar" } satisfies GoogleUserInfo;
  return (await response.json()) as GoogleUserInfo;
}

function encryptToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getTokenKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptToken(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== TOKEN_VERSION || !iv || !tag || !encrypted) {
    throw new Error("Invalid encrypted Google Calendar token");
  }
  const decipher = createDecipheriv("aes-256-gcm", getTokenKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function getTokenKey() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NEXT_PHASE === "phase-production-build") {
      return createHash("sha256").update("build-time-placeholder-google-token-key").digest();
    }
    if (process.env.NODE_ENV === "production") {
      throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY or BETTER_AUTH_SECRET is required in production");
    }
    return createHash("sha256").update("local-dev-google-token-key").digest();
  }
  return createHash("sha256").update(secret).digest();
}

function signState(encodedPayload: string) {
  return createHmac("sha256", getTokenKey()).update(encodedPayload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
