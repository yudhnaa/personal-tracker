import { useCallbackRef } from "./use-callback-ref";
import { useEffect, useRef, useState } from "react";

/** Fired when a write fails because localStorage is full; UI shows a warning. */
export const STORAGE_FULL_EVENT = "pt:storage-full";

type Options = {
  /** Delay writes by N ms (coalesces rapid changes, e.g. typing a note). */
  debounce?: number;
};

/**
 * Persist a piece of React state in localStorage so every tracker keeps its
 * data across reloads. Reads lazily on mount, writes on change. Pass
 * `{ debounce }` for high-frequency state (free text) to avoid re-serializing
 * on every keystroke; pending writes are flushed before the tab goes away.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: Options,
) {
  const [value, setValue] = useState<T>(() => readStored(key, initialValue));
  const debounceMs = options?.debounce ?? 0;
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const persist = useCallbackRef((next: T) => {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch (e) {
      // Quota exceeded or storage unavailable — keep state in memory only and
      // warn the user instead of failing silently (which loses data on reload).
      if (isQuotaError(e)) {
        window.dispatchEvent(new CustomEvent(STORAGE_FULL_EVENT));
      }
    }
  });

  useEffect(() => {
    if (debounceMs <= 0) {
      persist(value);
      return;
    }
    const id = window.setTimeout(() => persist(value), debounceMs);
    return () => window.clearTimeout(id);
  }, [value, persist, debounceMs]);

  // Never drop a pending debounced write when the tab hides/closes or the
  // component unmounts.
  useEffect(() => {
    if (debounceMs <= 0) return;
    const flush = () => persist(valueRef.current);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [persist, debounceMs]);

  return [value, setValue] as const;
}

function isQuotaError(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === "QuotaExceededError" ||
      e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      e.code === 22)
  );
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
