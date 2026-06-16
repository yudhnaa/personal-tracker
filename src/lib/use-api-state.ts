"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson } from "./api-client";

export function useApiState<T>(url: string, fallback: T, queryKey?: string[]) {
  const queryClient = useQueryClient();
  const key = queryKey || [url];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: key,
    queryFn: async () => {
      return apiJson<T>(url);
    },
  });

  const setData = useCallback(
    (updater: T | ((prev: T) => T)) => {
      queryClient.setQueryData<T>(key, (old) => {
        const current = old === undefined ? fallback : old;
        return typeof updater === "function" ? (updater as any)(current) : updater;
      });
    },
    [queryClient, key, fallback]
  );

  const commit = useCallback(
    async <R,>(request: Promise<R>, recover: () => T | Promise<T>) => {
      try {
        const result = await request;
        // Invalidate to sync server state after successful mutation
        void queryClient.invalidateQueries({ queryKey: key });
        return result;
      } catch (err) {
        const recoveredData = await recover();
        queryClient.setQueryData<T>(key, recoveredData);
        return undefined;
      }
    },
    [queryClient, key]
  );

  return {
    data: data === undefined ? fallback : data,
    setData,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    reload: refetch,
    commit,
  };
}
