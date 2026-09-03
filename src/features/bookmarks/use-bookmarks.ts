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
type BookmarkGroup = { id: string; name: string; position: number };
type BookmarkCollection = {
  bookmarks: Bookmark[];
  groups: string[];
  groupItems: BookmarkGroup[];
};

/**
 * Bookmark store. Groups are first-class entities (their own list) so a group
 * can be created/kept independently of whether any bookmark uses it.
 */
export function useBookmarks() {
  const { data, setData, commit, reload } = useApiState<BookmarkCollection>(
    "/api/v1/bookmarks",
    { bookmarks: [], groups: [], groupItems: [] },
  );
  const { bookmarks, groups, groupItems } = data;

  function addGroup(name: string) {
    const clean = name.trim();
    if (!clean) return;
    setData((prev) => ({
      ...prev,
      groups: prev.groups.includes(clean) ? prev.groups : [...prev.groups, clean],
    }));
    void commit(
      apiJson<typeof data>("/api/v1/bookmark-groups", {
        method: "POST",
        body: JSON.stringify({ name: clean }),
      }),
      async () => {
        await reload();
      },
    )
      .then((next) => setData(next))
      .catch(() => undefined);
  }

  async function addBookmark(draft: BookmarkDraft): Promise<boolean> {
    const url = normalizeUrl(draft.url);
    if (!url) return false;
    const group = draft.group.trim();
    const payload = { url, title: draft.title.trim() || titleFromUrl(url), group };
    try {
      const next = await commit(
        apiJson<typeof data>("/api/v1/bookmarks", {
          method: "POST",
          body: JSON.stringify(payload),
        }),
      );
      setData(next);
      return true;
    } catch {
      return false;
    }
  }

  function removeBookmark(id: string) {
    setData((prev) => ({
      ...prev,
      bookmarks: prev.bookmarks.filter((b) => b.id !== id),
    }));
    void commit(apiJson<typeof data>(`/api/v1/bookmarks/${id}`, { method: "DELETE" }), async () => {
      await reload();
    })
      .then((next) => setData(next))
      .catch(() => undefined);
  }

  /** Delete a group entity and detach any bookmarks that referenced it. */
  function removeGroup(name: string) {
    const group = groupItems.find((item) => item.name === name);
    if (!group) return;
    setData((prev) => ({
      groups: prev.groups.filter((g) => g !== name),
      bookmarks: prev.bookmarks.map((b) => (b.group === name ? { ...b, group: "" } : b)),
      groupItems: prev.groupItems.filter((item) => item.id !== group.id),
    }));
    void commit(
      apiJson<typeof data>(`/api/v1/bookmark-groups/${encodeURIComponent(group.id)}`, {
        method: "DELETE",
      }),
      async () => {
        await reload();
      },
    )
      .then((next) => setData(next))
      .catch(() => undefined);
  }

  /** Rename a group and re-point every bookmark that used the old name. */
  function renameGroup(from: string, to: string) {
    const clean = to.trim();
    const group = groupItems.find((item) => item.name === from);
    if (!group || !clean || clean === from || groups.includes(clean)) return;
    setData((prev) => ({
      groups: prev.groups.map((g) => (g === from ? clean : g)),
      bookmarks: prev.bookmarks.map((b) => (b.group === from ? { ...b, group: clean } : b)),
      groupItems: prev.groupItems.map((item) =>
        item.id === group.id ? { ...item, name: clean } : item,
      ),
    }));
    void commit(
      apiJson<typeof data>(`/api/v1/bookmark-groups/${encodeURIComponent(group.id)}`, {
        method: "PATCH",
        body: JSON.stringify({ name: clean }),
      }),
      async () => {
        await reload();
      },
    )
      .then((next) => setData(next))
      .catch(() => undefined);
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
