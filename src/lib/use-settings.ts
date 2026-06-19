import { useEffect, useMemo, useState } from "react";
import { apiJson } from "./api-client";
import { applySettings, DEFAULT_SETTINGS, type Settings } from "./settings";
import { useApiState } from "./use-api-state";

const SETTINGS_CACHE_KEY = "dashboard_settings_cache";

function getCachedSettings(): Settings | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const cached = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (cached) return JSON.parse(cached) as Settings;
  } catch (e) {
    console.error("Failed to parse cached settings", e);
  }
  return undefined;
}

/** Read/write personalization settings and keep the DOM in sync with them. */
export function useSettings() {
  const [cachedFallback] = useState(() => getCachedSettings());
  
  const { data: stored, setData: setSettings, commit, reload } = useApiState<Settings>(
    "/api/settings",
    cachedFallback || DEFAULT_SETTINGS,
  );
  // Merge defaults so settings saved before a new field existed still resolve.
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...stored }), [stored]);

  useEffect(() => {
    applySettings(settings);
    if (typeof window !== "undefined") {
      localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings));
    }
  }, [settings]);

  function update(patch: Partial<Settings>) {
    setSettings((prev) => ({ ...prev, ...patch }));
    void commit(
      apiJson<Settings>("/api/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
      async () => {
        await reload();
        return stored;
      },
    );
  }

  return { settings, update };
}
