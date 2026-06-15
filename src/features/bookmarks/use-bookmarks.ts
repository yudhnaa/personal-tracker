import { apiJson } from "../../lib/api-client";
import { useApiState } from "../../lib/use-api-state";
import { normalizeUrl, titleFromUrl } from "../../lib/url";

export type Bookmark = {
  id: string;
  url: string;
  title: string;
  /** Empty string means "ungrouped". */
  group: string;
  createdAt: number;
};

export type BookmarkDraft = { url: string; title: string; group: string };

/**
 * Bookmark store. Groups are first-class entities (their own list) so a group
 * can be created/kept independently of whether any bookmark uses it.
 */
export function useBookmarks() {
  const { data, setData, commit, reload } = useApiState<{
    bookmarks: Bookmark[];
    groups: string[];
  }>("/api/bookmarks", { bookmarks: [], groups: [] });
  const { bookmarks, groups } = data;

  function addGroup(name: string) {
    const clean = name.trim();
    if (!clean) return;
    setData((prev) => ({
      ...prev,
      groups: prev.groups.includes(clean) ? prev.groups : [...prev.groups, clean],
    }));
    void commit(
      apiJson<typeof data>("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify({ kind: "group", group: clean }),
      }),
      async () => {
        await reload();
        return data;
      },
    ).then((next) => {
      if (next) setData(next);
    });
  }

  function addBookmark(draft: BookmarkDraft) {
    const url = normalizeUrl(draft.url);
    if (!url) return;
    const group = draft.group.trim();
    if (group) addGroup(group);
    const payload = { url, title: draft.title.trim() || titleFromUrl(url), group };
    void commit(
      apiJson<typeof data>("/api/bookmarks", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
      async () => {
        await reload();
        return data;
      },
    ).then((next) => {
      if (next) setData(next);
    });
  }

  function removeBookmark(id: string) {
    setData((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.filter((b) => b.id !== id),
    }));
    void commit(apiJson<typeof data>(`/api/bookmarks/${id}`, { method: "DELETE" }), async () => {
      await reload();
      return data;
    }).then((next) => {
      if (next) setData(next);
    });
  }

  /** Delete a group entity and detach any bookmarks that referenced it. */
  function removeGroup(name: string) {
    setData((prev) => ({
      groups: prev.groups.filter((g) => g !== name),
      bookmarks: prev.bookmarks.map((b) => (b.group === name ? { ...b, group: "" } : b)),
    }));
    void commit(
      apiJson<typeof data>(`/api/bookmark-groups?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      }),
      async () => {
        await reload();
        return data;
      },
    ).then((next) => {
      if (next) setData(next);
    });
  }

  /** Rename a group and re-point every bookmark that used the old name. */
  function renameGroup(from: string, to: string) {
    const clean = to.trim();
    if (!clean || clean === from || groups.includes(clean)) return;
    setData((prev) => ({
      groups: prev.groups.map((g) => (g === from ? clean : g)),
      bookmarks: prev.bookmarks.map((b) => (b.group === from ? { ...b, group: clean } : b)),
    }));
    void commit(
      apiJson<typeof data>("/api/bookmark-groups", {
        method: "PATCH",
        body: JSON.stringify({ from, to: clean }),
      }),
      async () => {
        await reload();
        return data;
      },
    ).then((next) => {
      if (next) setData(next);
    });
  }

  return {
    bookmarks,
    groups,
    addGroup,
    addBookmark,
    removeBookmark,
    removeGroup,
    renameGroup,
  };
}
