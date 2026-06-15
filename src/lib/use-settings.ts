import { useEffect, useMemo } from "react";
import { apiJson } from "./api-client";
import { applySettings, DEFAULT_SETTINGS, type Settings } from "./settings";
import { useApiState } from "./use-api-state";

/** Read/write personalization settings and keep the DOM in sync with them. */
export function useSettings() {
  const { data: stored, setData: setSettings, commit, reload } = useApiState<Settings>(
    "/api/settings",
    DEFAULT_SETTINGS,
  );
  // Merge defaults so settings saved before a new field existed still resolve.
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, ...stored }), [stored]);

  useEffect(() => {
    applySettings(settings);
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
