import { useEffect, useMemo, useState } from "react";
import { apiJson } from "./api-client";
import { captureClientCacheScope, isClientCacheScopeCurrent } from "./client-cache";
import { applySettings, DEFAULT_SETTINGS, type Settings } from "./settings";
import { createSettingsSync } from "./settings-sync";
import { useApiState } from "./use-api-state";

/** Read/write personalization settings and keep the DOM in sync with them. */
export function useSettings(accountId: string) {
  const { data: stored, setData: setSettings } = useApiState<Settings>(
    "/api/v1/settings",
    DEFAULT_SETTINGS,
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [clientScope] = useState(captureClientCacheScope);
  const isActiveScope = () => (
    clientScope.subject === accountId && isClientCacheScopeCurrent(clientScope)
  );
  const [settingsSync] = useState(() => createSettingsSync<Settings>({
    persist: (patch) => apiJson<Settings>("/api/v1/settings", {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),
    reload: () => apiJson<Settings>("/api/v1/settings"),
    onSynced: (persisted, pending, source) => {
      setSettings({ ...persisted, ...pending });
      if (source === "persist") setSaveError(null);
    },
    onError: (error) => {
      setSaveError(error instanceof Error ? error.message : String(error));
    },
    isActive: isActiveScope,
  }));
  // Merge defaults so settings saved before a new field existed still resolve.
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...stored }), [stored]);

  useEffect(() => {
    applySettings(settings);
  }, [settings]);

  useEffect(() => {
    settingsSync.activate();
    return () => settingsSync.dispose();
  }, [settingsSync]);

  function update(patch: Partial<Settings>) {
    if (!isActiveScope()) return;
    setSettings((prev) => ({ ...prev, ...patch }));
    settingsSync.enqueue(patch);
  }

  return { settings, update, saveError };
}
