"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { useState } from "react";

const PERSIST_ALLOWLIST = [
  "/api/welcome",
  "/api/bookmarks",
  "/api/habits",
  "/api/notes",
  "/api/todos",
  "/api/settings",
  "/api/google-calendar/events",
];

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 24 * 60 * 60 * 1000, // 24 hours
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            retry: 1,
          },
        },
      }),
  );

  const [persister] = useState(() => {
    if (typeof window === "undefined") return undefined;
    try {
      // Test if localStorage is accessible
      window.localStorage.getItem("pt_query_cache_test");
      return createSyncStoragePersister({
        storage: window.localStorage,
        key: "pt_query_cache",
      });
    } catch {
      return undefined;
    }
  });

  if (!persister) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        buster: "multi-notes-timezone-calendar-v2",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0];
            if (typeof key !== "string") return false;
            return PERSIST_ALLOWLIST.some(prefix => key === prefix || key.startsWith(prefix + "?"));
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
