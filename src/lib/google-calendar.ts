import "server-only";

import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
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
  if (!tokenResponse.access_token || !tokenResponse.refresh_token) {
    throw new Error(tokenResponse.error_description ?? tokenResponse.error ?? "Google did not return OAuth tokens");
  }

  const googleEmail = await fetchGoogleEmail(tokenResponse.access_token);
  const expiresInSeconds = tokenResponse.expires_in ?? 3600;
  const selectedCalendarIds = JSON.stringify(["primary"]);
  const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);
  const now = new Date();

  await db
    .insert(googleCalendarConnections)
    .values({
      userId,
      googleEmail,
      accessToken: encryptToken(tokenResponse.access_token),
      refreshToken: encryptToken(tokenResponse.refresh_token),
      tokenExpiresAt,
      scope: tokenResponse.scope ?? config.scopes.join(" "),
      selectedCalendarIds,
      syncIntervalMinutes: 5,
      reconnectRequired: false,
      connectedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: googleCalendarConnections.userId,
      set: {
        googleEmail,
        accessToken: encryptToken(tokenResponse.access_token),
        refreshToken: encryptToken(tokenResponse.refresh_token),
        tokenExpiresAt,
        scope: tokenResponse.scope ?? config.scopes.join(" "),
        selectedCalendarIds,
        reconnectRequired: false,
        updatedAt: now,
      },
    });

  return getGoogleCalendarConnectionStatus(userId);
}

export async function getGoogleCalendarConnectionStatus(userId: string): Promise<GoogleCalendarConnectionStatus> {
  const [connection] = await db
    .select({
      googleEmail: googleCalendarConnections.googleEmail,
      selectedCalendarIds: googleCalendarConnections.selectedCalendarIds,
      syncIntervalMinutes: googleCalendarConnections.syncIntervalMinutes,
      reconnectRequired: googleCalendarConnections.reconnectRequired,
    })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);

  if (!connection) {
    return {
      connected: false,
      googleEmail: null,
      selectedCalendarIds: [],
      syncIntervalMinutes: 5,
      reconnectRequired: false,
    };
  }

  return {
    connected: !connection.reconnectRequired,
    googleEmail: connection.googleEmail,
    selectedCalendarIds: parseSelectedCalendarIds(connection.selectedCalendarIds),
    syncIntervalMinutes: connection.syncIntervalMinutes,
    reconnectRequired: connection.reconnectRequired,
  };
}

export async function disconnectGoogleCalendar(userId: string) {
  await db.delete(googleCalendarEventCache).where(eq(googleCalendarEventCache.userId, userId));
  await db.delete(googleCalendarConnections).where(eq(googleCalendarConnections.userId, userId));
  return getGoogleCalendarConnectionStatus(userId);
}

export async function listGoogleCalendars(userId: string): Promise<GoogleCalendarListItem[]> {
  const selectedCalendarIds = await getSelectedCalendarIds(userId);
  const response = await googleCalendarFetch<CalendarListResponse>(userId, "/users/me/calendarList");
  return (response.items ?? [])
    .filter((calendar) => Boolean(calendar.id))
    .map((calendar) => ({
      id: calendar.id!,
      summary: calendar.summary ?? calendar.id!,
      primary: calendar.primary ?? false,
      backgroundColor: calendar.backgroundColor ?? null,
      accessRole: calendar.accessRole ?? "reader",
      selected: selectedCalendarIds.includes(calendar.id!),
    }));
}

export async function updateSelectedGoogleCalendars(userId: string, selectedCalendarIds: string[]) {
  await ensureGoogleCalendarConnection(userId);
  await db
    .update(googleCalendarConnections)
    .set({
      selectedCalendarIds: JSON.stringify(selectedCalendarIds),
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.userId, userId));
  return listGoogleCalendars(userId);
}

export async function syncGoogleCalendarEvents(userId: string, range: { start: string; end: string }) {
  const connection = await ensureGoogleCalendarConnection(userId);
  const calendarIds = parseSelectedCalendarIds(connection.selectedCalendarIds);
  if (!calendarIds.length) return [];

  const events: GoogleCalendarEvent[] = [];
  for (const calendarId of calendarIds) {
    const params = new URLSearchParams({
      singleEvents: "true",
      orderBy: "startTime",
      showDeleted: "true",
      timeMin: toGoogleRangeStart(range.start),
      timeMax: toGoogleRangeEnd(range.end),
    });
    const response = await googleCalendarFetch<EventsResponse>(
      userId,
      `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
    );

    for (const apiEvent of response.items ?? []) {
      if (apiEvent.status === "cancelled" && apiEvent.id) {
        await deleteCachedGoogleCalendarEvent(userId, calendarId, apiEvent.id);
        await db.delete(todos).where(
          and(
            eq(todos.userId, userId),
            eq(todos.googleCalendarId, calendarId),
            eq(todos.googleEventId, apiEvent.id)
          )
        );
        continue;
      }

      const event = normalizeGoogleEvent(calendarId, apiEvent);
      if (!event) continue;

      const [localTask] = await db
        .select()
        .from(todos)
        .where(
          and(
            eq(todos.userId, userId),
            eq(todos.googleCalendarId, calendarId),
            eq(todos.googleEventId, event.id)
          )
        )
        .limit(1);

      if (localTask && localTask.syncStatus === "error") {
        const draft: GoogleCalendarEventDraft = {
          title: localTask.title,
          description: localTask.description || undefined,
          location: localTask.location || undefined,
          start: localTask.startAt || localTask.dueDate || undefined,
          end: localTask.endAt || undefined,
          allDay: localTask.allDay,
        };
        try {
          const updatedEvent = await updateGoogleCalendarEvent(userId, calendarId, event.id, draft);
          await db
            .update(todos)
            .set({
              syncStatus: "synced",
              googleEventPayload: { etag: updatedEvent.etag, updated: updatedEvent.updated },
            })
            .where(eq(todos.id, localTask.id));
          events.push(await reconcileFetchedEvent(userId, updatedEvent));
        } catch (e) {
          events.push(await reconcileFetchedEvent(userId, event));
        }
      } else {
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
              googleEventPayload: { etag: reconciled.etag, updated: reconciled.updated },
              syncStatus: "synced",
            })
            .where(eq(todos.id, localTask.id));
        }
        events.push(reconciled);
      }
    }
  }

  await db
    .update(googleCalendarConnections)
    .set({ lastSyncedAt: new Date(), reconnectRequired: false, updatedAt: new Date() })
    .where(eq(googleCalendarConnections.userId, userId));

  return events.sort((a, b) => a.start.localeCompare(b.start));
}

export async function createGoogleCalendarEvent(userId: string, draft: GoogleCalendarEventDraft) {
  const calendarId = draft.calendarId;
  const selectedCalendarIds = await getSelectedCalendarIds(userId);
  if (!calendarId || !selectedCalendarIds.includes(calendarId)) {
    throw new GoogleCalendarApiError("Choose an enabled Google Calendar", 400);
  }

  const response = await googleCalendarFetch<GoogleCalendarApiEvent>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify(toGoogleEventPayload(draft)),
    },
  );
  const event = normalizeGoogleEvent(calendarId, response);
  if (!event) throw new GoogleCalendarApiError("Google returned an invalid event", 502);
  await upsertCachedEvent(userId, event, { localUpdatedAt: new Date(), pendingLocalUpdate: false });
  return event;
}

export async function updateGoogleCalendarEvent(
  userId: string,
  calendarId: string,
  eventId: string,
  patch: GoogleCalendarEventDraft,
) {
  const response = await googleCalendarFetch<GoogleCalendarApiEvent>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(toGoogleEventPayload(patch)),
    },
  );
  const event = normalizeGoogleEvent(calendarId, response);
  if (!event) throw new GoogleCalendarApiError("Google returned an invalid event", 502);
  await upsertCachedEvent(userId, event, { localUpdatedAt: new Date(), pendingLocalUpdate: true });
  return event;
}

export async function deleteGoogleCalendarEvent(userId: string, calendarId: string, eventId: string) {
  await googleCalendarFetch<void>(
    userId,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE" },
  );
  await deleteCachedGoogleCalendarEvent(userId, calendarId, eventId);
  return { ok: true };
}

export async function markGoogleCalendarReconnectRequired(userId: string) {
  await db
    .update(googleCalendarConnections)
    .set({ reconnectRequired: true, updatedAt: new Date() })
    .where(eq(googleCalendarConnections.userId, userId));
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

export function encryptedTokenForTestOnly(value: string) {
  return encryptToken(value);
}

export function decryptGoogleCalendarToken(value: string) {
  return decryptToken(value);
}

export async function deleteCachedGoogleCalendarEvent(userId: string, calendarId: string, googleEventId: string) {
  await db
    .delete(googleCalendarEventCache)
    .where(
      and(
        eq(googleCalendarEventCache.userId, userId),
        eq(googleCalendarEventCache.calendarId, calendarId),
        eq(googleCalendarEventCache.googleEventId, googleEventId),
      ),
    );
}

async function ensureGoogleCalendarConnection(userId: string) {
  const [connection] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  if (!connection) {
    throw new GoogleCalendarApiError("Google Calendar is not connected", 404);
  }
  if (connection.reconnectRequired) {
    throw new GoogleCalendarApiError("Reconnect Google Calendar", 401, true);
  }
  return connection;
}

async function getSelectedCalendarIds(userId: string) {
  const connection = await ensureGoogleCalendarConnection(userId);
  return parseSelectedCalendarIds(connection.selectedCalendarIds);
}

async function googleCalendarFetch<T>(userId: string, path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = await getValidGoogleAccessToken(userId);
  const response = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (response.status === 401) {
    await markGoogleCalendarReconnectRequired(userId);
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

async function getValidGoogleAccessToken(userId: string) {
  const connection = await ensureGoogleCalendarConnection(userId);
  if (connection.tokenExpiresAt.getTime() > Date.now() + 60_000) {
    return decryptToken(connection.accessToken);
  }
  return refreshGoogleAccessToken(userId, connection);
}

async function refreshGoogleAccessToken(userId: string, connection: CalendarConnectionRow) {
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
    await markGoogleCalendarReconnectRequired(userId);
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
    .where(eq(googleCalendarConnections.userId, userId));

  return body.access_token;
}

async function reconcileFetchedEvent(userId: string, event: GoogleCalendarEvent) {
  const cached = await getCachedEvent(userId, event.calendarId, event.id);
  if (cached?.pendingLocalUpdate && !cached.deleted) {
    const pushed = await pushCachedEventToGoogle(userId, cached);
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
  const response = await googleCalendarFetch<GoogleCalendarApiEvent>(
    userId,
    `/calendars/${encodeURIComponent(cached.calendarId)}/events/${encodeURIComponent(cached.googleEventId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(
        toGoogleEventPayload({
          title: cached.title,
          description: cached.description,
          location: cached.location,
          start: cached.start,
          end: cached.end,
          allDay: cached.allDay,
        }),
      ),
    },
  );
  const event = normalizeGoogleEvent(cached.calendarId, response);
  if (!event) throw new GoogleCalendarApiError("Google returned an invalid event", 502);
  return event;
}

async function getCachedEvent(userId: string, calendarId: string, googleEventId: string) {
  const [cached] = await db
    .select()
    .from(googleCalendarEventCache)
    .where(
      and(
        eq(googleCalendarEventCache.userId, userId),
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
        googleCalendarEventCache.calendarId,
        googleCalendarEventCache.googleEventId,
      ],
      set: {
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

function normalizeGoogleEvent(calendarId: string, event: GoogleCalendarApiEvent): GoogleCalendarEvent | null {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !start || !end) return null;
  return {
    id: event.id,
    calendarId,
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

async function fetchGoogleEmail(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return "Google Calendar";
  const body = (await response.json()) as GoogleUserInfo;
  return body.email ?? "Google Calendar";
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
