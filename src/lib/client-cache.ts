"use client";

export const CLIENT_CACHE_SUBJECT_KEY = "pt_cache_subject";
let activeClientCacheSubject: string | null = null;
let activeClientCacheGeneration = 0;
const subjectListeners = new Set<() => void>();
const LEGACY_USER_CACHE_KEYS = [
  "pt_query_cache",
  "dashboard_settings_cache",
  "pt_welcomed",
];

export function scopeClientCache(userId: string): boolean {
  if (typeof window === "undefined") return false;
  const changed = activeClientCacheSubject !== userId;
  const persistedSubject = readLocalStorage(CLIENT_CACHE_SUBJECT_KEY);
  if (
    (activeClientCacheSubject !== null && changed)
    || (persistedSubject.available && persistedSubject.value !== userId)
  ) clearUserCache();
  setActiveClientCacheSubject(userId);
  writeLocalStorage(CLIENT_CACHE_SUBJECT_KEY, userId);
  return changed;
}

export function getActiveClientCacheSubject(): string | null {
  return activeClientCacheSubject;
}

export type ClientCacheScope = Readonly<{
  subject: string | null;
  generation: number;
}>;

export function captureClientCacheScope(): ClientCacheScope {
  return {
    subject: activeClientCacheSubject,
    generation: activeClientCacheGeneration,
  };
}

export function isClientCacheScopeCurrent(scope: ClientCacheScope): boolean {
  if (
    scope.subject !== activeClientCacheSubject
    || scope.generation !== activeClientCacheGeneration
  ) return false;
  if (typeof window === "undefined") return true;
  const persistedSubject = readLocalStorage(CLIENT_CACHE_SUBJECT_KEY);
  return !persistedSubject.available || persistedSubject.value === scope.subject;
}

export function subscribeToClientCacheSubject(listener: () => void): () => void {
  subjectListeners.add(listener);
  return () => subjectListeners.delete(listener);
}

/** Invalidate only this tab after another tab changes the shared auth session. */
export function invalidateActiveClientCacheSubject(): void {
  setActiveClientCacheSubject(null);
}

export function clearUserCache(): void {
  setActiveClientCacheSubject(null);
  if (typeof window === "undefined") return;
  for (const key of LEGACY_USER_CACHE_KEYS) removeLocalStorage(key);
  removeLocalStorage(CLIENT_CACHE_SUBJECT_KEY);
  try {
    window.sessionStorage.clear();
  } catch {
    // Storage may be disabled; the in-memory subject is already invalidated.
  }
}

function readLocalStorage(key: string): { available: boolean; value: string | null } {
  try {
    return { available: true, value: window.localStorage.getItem(key) };
  } catch {
    return { available: false, value: null };
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The in-memory subject remains authoritative for this tab.
  }
}

function removeLocalStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The in-memory subject has already been cleared.
  }
}

function setActiveClientCacheSubject(subject: string | null): void {
  if (activeClientCacheSubject === subject) return;
  activeClientCacheSubject = subject;
  activeClientCacheGeneration += 1;
  for (const listener of subjectListeners) listener();
}
