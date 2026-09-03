import { apiJson } from "@/lib/api-client";
import { captureClientCacheScope, isClientCacheScopeCurrent } from "@/lib/client-cache";
import { createLatestMutationQueue } from "@/lib/latest-mutation";
import { useApiState } from "@/lib/use-api-state";
import type { Note } from "./types";
import { useCallback, useEffect, useState } from "react";

export function useNotes(accountId: string) {
  const { data: notes, setData, commit, reload } = useApiState<Note[]>("/api/v1/notes", []);
  const [clientScope] = useState(captureClientCacheScope);
  const isActiveScope = useCallback(() => (
    clientScope.subject === accountId
    && isClientCacheScopeCurrent(clientScope)
  ), [accountId, clientScope]);
  const [saveQueue] = useState(() => createLatestMutationQueue<
    string,
    Pick<Note, "title" | "text">,
    Note
  >({
    persist: (id, draft) => apiJson<Note>(`/api/v1/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(draft),
    }),
    onSaved: (id, saved) => {
      if (!isActiveScope()) return;
      setData((current) => current.map((note) => (note.id === id ? saved : note)));
    },
    isActive: isActiveScope,
  }));

  useEffect(() => {
    saveQueue.activate();
    return () => saveQueue.dispose();
  }, [saveQueue]);

  const addNote = useCallback(async () => {
    if (!isActiveScope()) return null;
    const created = await commit(
      apiJson<Note>("/api/v1/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Note", text: "" }),
      }),
    );
    if (!isActiveScope()) return null;
    if (created) setData((current) => [...current, created]);
    return created ?? null;
  }, [commit, isActiveScope, setData]);

  const patchNote = useCallback((id: string, patch: Partial<Pick<Note, "title" | "text">>) => {
    if (!isActiveScope()) return;
    let pendingDraft: Pick<Note, "title" | "text"> | null = null;
    setData((current) =>
      current.map((note) => {
        if (note.id !== id) return note;
        const next = { ...note, ...patch, updatedAt: new Date().toISOString() };
        pendingDraft = { title: next.title, text: next.text };
        return next;
      }),
    );
    if (pendingDraft) saveQueue.enqueue(id, pendingDraft);
  }, [isActiveScope, saveQueue, setData]);

  const removeNote = useCallback((id: string) => {
    if (!isActiveScope()) return;
    saveQueue.clear(id);
    setData((current) => current.filter((note) => note.id !== id));
    void commit(
      apiJson<{ ok: true }>(`/api/v1/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
      async () => {
        await reload();
      },
    ).catch(() => undefined);
  }, [commit, isActiveScope, reload, saveQueue, setData]);

  return { notes, addNote, patchNote, removeNote };
}
