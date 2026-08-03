import { apiJson } from "@/lib/api-client";
import { useApiState } from "@/lib/use-api-state";
import type { Note } from "@/lib/dashboard-data";
import { useCallback } from "react";

export function useNotes() {
  const { data: notes, setData, commit, reload } = useApiState<Note[]>("/api/notes", []);

  const addNote = useCallback(async () => {
    const created = await commit(
      apiJson<Note>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Note", text: "" }),
      }),
      () => notes,
    );
    if (created) setData((current) => [...current, created]);
    return created ?? null;
  }, [commit, notes, setData]);

  const patchNote = useCallback((id: string, patch: Partial<Pick<Note, "title" | "text">>) => {
    setData((current) =>
      current.map((note) =>
        note.id === id
          ? { ...note, ...patch, updatedAt: new Date().toISOString() }
          : note,
      ),
    );
    void apiJson<Note>(`/api/notes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    },
    )
      .then((saved) => {
        if (!saved) return;
        setData((current) => current.map((note) => (note.id === id ? saved : note)));
      })
      .catch(() => {
        void reload();
      });
  }, [reload, setData]);

  const removeNote = useCallback((id: string) => {
    setData((current) => current.filter((note) => note.id !== id));
    void commit(
      apiJson<{ ok: true }>(`/api/notes/${encodeURIComponent(id)}`, { method: "DELETE" }),
      async () => {
        await reload();
        return notes;
      },
    );
  }, [commit, notes, reload, setData]);

  return { notes, addNote, patchNote, removeNote };
}
