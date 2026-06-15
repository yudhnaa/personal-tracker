"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiJson } from "./api-client";

export function useApiState<T>(url: string, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await apiJson<T>(url);
      if (mounted.current) setData(next);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
    };
  }, [reload]);

  const commit = useCallback(
    async <R,>(request: Promise<R>, recover: () => T | Promise<T>) => {
      try {
        return await request;
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : "Request failed");
          setData(await recover());
        }
        return undefined;
      }
    },
    [],
  );

  return { data, setData, loading, error, reload, commit };
}
