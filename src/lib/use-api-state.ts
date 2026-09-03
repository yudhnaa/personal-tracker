"use client";

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiJson, ClientSessionChangedError } from "./api-client";
import { captureClientCacheScope, isClientCacheScopeCurrent } from "./client-cache";
import { runMutationRecovery, type MutationRecovery } from "./mutation-recovery";

export function useApiState<T>(url: string, fallback: T, queryKey?: string[]) {
  const queryClient = useQueryClient();
  const key = useMemo(() => queryKey ?? [url], [queryKey, url]);

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
        return typeof updater === "function"
          ? (updater as (previous: T) => T)(current)
          : updater;
      });
    },
    [queryClient, key, fallback]
  );

  const commit = useCallback(
    async <R,>(request: Promise<R>, recover?: MutationRecovery) => {
      const scope = captureClientCacheScope();
      const assertActiveScope = () => {
        if (!scope.subject || !isClientCacheScopeCurrent(scope)) {
          throw new ClientSessionChangedError();
        }
      };
      assertActiveScope();
      try {
        const result = await request;
        assertActiveScope();
        // Invalidate to sync server state after successful mutation
        void queryClient.invalidateQueries({ queryKey: key });
        return result;
      } catch (err) {
        if (err instanceof ClientSessionChangedError || !isClientCacheScopeCurrent(scope)) {
          throw new ClientSessionChangedError();
        }
        await runMutationRecovery(recover);
        assertActiveScope();
        throw err;
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
