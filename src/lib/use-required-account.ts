"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiJson } from "./api-client";
import type { Account } from "./auth-client";
import {
  CLIENT_CACHE_SUBJECT_KEY,
  clearUserCache,
  getActiveClientCacheSubject,
  invalidateActiveClientCacheSubject,
  scopeClientCache,
  subscribeToClientCacheSubject,
} from "./client-cache";

export const CURRENT_ACCOUNT_QUERY_KEY = ["/api/v1/auth/me"] as const;

export function useCurrentAccount() {
  return useQuery({
    queryKey: CURRENT_ACCOUNT_QUERY_KEY,
    queryFn: ({ signal }) => apiJson<Account>("/api/v1/auth/me", { signal }),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
  });
}

export function useRequiredAccount() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const query = useCurrentAccount();
  const scopedUserId = useSyncExternalStore(
    subscribeToClientCacheSubject,
    getActiveClientCacheSubject,
    () => null,
  );
  const needsCacheScope = Boolean(query.data && scopedUserId !== query.data.id);

  useEffect(() => {
    let previousSubject = getActiveClientCacheSubject();

    const unsubscribe = subscribeToClientCacheSubject(() => {
      const nextSubject = getActiveClientCacheSubject();
      const sessionWasInvalidated = previousSubject !== null && nextSubject === null;
      previousSubject = nextSubject;
      if (!sessionWasInvalidated) return;

      queryClient.removeQueries({
        predicate: (cachedQuery) => cachedQuery.queryKey[0] !== CURRENT_ACCOUNT_QUERY_KEY[0],
      });
      void queryClient.resetQueries({ queryKey: CURRENT_ACCOUNT_QUERY_KEY, exact: true });
    });

    function handleStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage || event.key !== CLIENT_CACHE_SUBJECT_KEY) return;
      if (event.newValue === getActiveClientCacheSubject()) return;

      invalidateActiveClientCacheSubject();
      queryClient.removeQueries({
        predicate: (cachedQuery) => cachedQuery.queryKey[0] !== CURRENT_ACCOUNT_QUERY_KEY[0],
      });
      void queryClient.resetQueries({ queryKey: CURRENT_ACCOUNT_QUERY_KEY, exact: true });
    }

    window.addEventListener("storage", handleStorage);
    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
    };
  }, [queryClient]);

  useEffect(() => {
    if (!query.data) return;
    if (scopeClientCache(query.data.id)) {
      queryClient.removeQueries({
        predicate: (cachedQuery) => cachedQuery.queryKey[0] !== CURRENT_ACCOUNT_QUERY_KEY[0],
      });
    }
  }, [query.data, queryClient]);

  useEffect(() => {
    if (query.error instanceof ApiError && [401, 403].includes(query.error.status)) {
      queryClient.clear();
      clearUserCache();
      router.replace("/login");
    }
  }, [query.error, queryClient, router]);

  return {
    ...query,
    data: needsCacheScope ? undefined : query.data,
    isLoading: query.isLoading || needsCacheScope,
  };
}
