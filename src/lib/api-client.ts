"use client";

import {
  captureClientCacheScope,
  invalidateActiveClientCacheSubject,
  isClientCacheScopeCurrent,
  subscribeToClientCacheSubject,
  type ClientCacheScope,
} from "./client-cache";

const DEFAULT_GATEWAY_ORIGIN = "http://localhost:8080";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const SESSION_ESTABLISHING_PATHS = new Set([
  "/api/v1/auth/csrf",
  "/api/v1/auth/me",
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/provisioning-status",
  "/api/v1/auth/forgot-password",
  "/api/v1/auth/reset-password",
]);

let csrfTokenValue: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;
let csrfRefreshPromise: Promise<string> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class ClientSessionChangedError extends Error {
  constructor() {
    super("The active browser session changed while the request was in progress");
    this.name = "ClientSessionChangedError";
  }
}

export function gatewayApiUrl(path: string): string {
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(path) || path.startsWith("//")) {
    throw new TypeError("Gateway requests require an API path, not an absolute URL");
  }
  const origin = (process.env.NEXT_PUBLIC_API_GATEWAY_URL || DEFAULT_GATEWAY_ORIGIN).replace(/\/$/, "");
  const normalized = path.startsWith("/api/v1/")
    ? path
    : path.startsWith("/api/")
      ? `/api/v1/${path.slice("/api/".length)}`
      : `/api/v1/${path.replace(/^\//, "")}`;
  return `${origin}${normalized}`;
}

export function accountBoundGatewayNavigationUrl(path: string): string {
  const scope = captureClientCacheScope();
  assertClientCacheScope(scope);
  const url = new URL(gatewayApiUrl(path));
  url.searchParams.set("clientAccountId", scope.subject!);
  return url.toString();
}

function requestClientCacheScope(path: string): ClientCacheScope | null {
  const pathname = new URL(gatewayApiUrl(path)).pathname;
  return SESSION_ESTABLISHING_PATHS.has(pathname) ? null : captureClientCacheScope();
}

function assertClientCacheScope(scope: ClientCacheScope | null): void {
  if (scope && (!scope.subject || !isClientCacheScopeCurrent(scope))) {
    throw new ClientSessionChangedError();
  }
}

async function csrfToken(): Promise<string> {
  if (csrfTokenValue) return csrfTokenValue;
  csrfTokenPromise ??= fetch(gatewayApiUrl("/api/v1/auth/csrf"), {
    credentials: "include",
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) throw await apiError(response);
      const body = (await response.json()) as { csrfToken?: string };
      if (!body.csrfToken) throw new ApiError("Gateway did not return a CSRF token", 502);
      csrfTokenValue = body.csrfToken;
      return body.csrfToken;
    })
    .catch((error) => {
      csrfTokenPromise = null;
      throw error;
    });
  return csrfTokenPromise;
}

async function refreshCsrfToken(staleToken: string): Promise<string> {
  if (csrfTokenValue && csrfTokenValue !== staleToken) return csrfTokenValue;
  if (csrfRefreshPromise) return csrfRefreshPromise;
  csrfTokenValue = null;
  csrfTokenPromise = null;
  const refresh = csrfToken();
  csrfRefreshPromise = refresh;
  try {
    return await refresh;
  } finally {
    if (csrfRefreshPromise === refresh) csrfRefreshPromise = null;
  }
}

function invalidateCsrfToken(): void {
  csrfTokenValue = null;
  csrfTokenPromise = null;
  csrfRefreshPromise = null;
}

async function isCsrfFailure(response: Response): Promise<boolean> {
  if (response.status !== 403) return false;
  try {
    const body = await response.clone().json() as { code?: string };
    return body.code === "CSRF_INVALID";
  } catch {
    return false;
  }
}

function changesCsrfCookie(path: string, method: string, response: Response): boolean {
  if (!response.ok) return false;
  const normalizedPath = new URL(gatewayApiUrl(path)).pathname;
  return method === "POST" && new Set([
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/logout",
    "/api/v1/auth/reset-password",
    "/api/v1/auth/change-password",
  ]).has(normalizedPath);
}

export async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const scope = requestClientCacheScope(path);
  assertClientCacheScope(scope);
  const sessionController = scope ? new AbortController() : null;
  const unsubscribe = scope
    ? subscribeToClientCacheSubject(() => {
        if (!isClientCacheScopeCurrent(scope)) sessionController?.abort();
      })
    : () => undefined;
  const signal = init.signal && sessionController
    ? AbortSignal.any([init.signal, sessionController.signal])
    : sessionController?.signal ?? init.signal;
  const method = (init.method || "GET").toUpperCase();
  const mutating = MUTATING_METHODS.has(method);
  const request = async (token?: string) => {
    assertClientCacheScope(scope);
    const headers = new Headers(init.headers);
    if (scope?.subject) headers.set("x-client-account-id", scope.subject);
    if (init.body != null && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    let csrfTokenUsed: string | undefined;
    if (mutating) {
      csrfTokenUsed = token ?? await csrfToken();
      assertClientCacheScope(scope);
      headers.set("x-csrf-token", csrfTokenUsed);
    }
    const response = await fetch(gatewayApiUrl(path), {
      ...init,
      method,
      headers,
      credentials: "include",
      cache: init.cache ?? "no-store",
      signal,
    });
    assertClientCacheScope(scope);
    return { response, csrfTokenUsed };
  };

  try {
    const first = await request();
    let response = first.response;
    if (mutating && first.csrfTokenUsed && await isCsrfFailure(response)) {
      assertClientCacheScope(scope);
      const refreshedToken = await refreshCsrfToken(first.csrfTokenUsed);
      assertClientCacheScope(scope);
      response = (await request(refreshedToken)).response;
    }
    assertClientCacheScope(scope);
    if (changesCsrfCookie(path, method, response)) invalidateCsrfToken();
    return response;
  } catch (error) {
    if (scope && !isClientCacheScopeCurrent(scope)) {
      throw new ClientSessionChangedError();
    }
    throw error;
  } finally {
    unsubscribe();
  }
}

export async function apiJsonWithStatus<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; status: number }> {
  const scope = requestClientCacheScope(path);
  assertClientCacheScope(scope);
  const response = await gatewayFetch(path, init);
  assertClientCacheScope(scope);
  if (!response.ok) {
    const error = await apiError(response);
    assertClientCacheScope(scope);
    if (error.code === "ACCOUNT_CONTEXT_CHANGED") {
      invalidateActiveClientCacheSubject();
      throw new ClientSessionChangedError();
    }
    throw error;
  }
  if (response.status === 204) {
    assertClientCacheScope(scope);
    return { data: undefined as T, status: response.status };
  }
  const data = (await response.json()) as T;
  assertClientCacheScope(scope);
  return { data, status: response.status };
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  return (await apiJsonWithStatus<T>(path, init)).data;
}

async function apiError(response: Response): Promise<ApiError> {
  const raw = await response.text();
  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : undefined;
  } catch {
    body = undefined;
  }
  const details = body && typeof body === "object" ? body as Record<string, unknown> : undefined;
  const message = typeof details?.message === "string"
    ? details.message
    : typeof details?.error === "string"
      ? details.error
      : raw || `Request failed with ${response.status}`;
  return new ApiError(
    message,
    response.status,
    typeof details?.code === "string" ? details.code : undefined,
    body,
  );
}
