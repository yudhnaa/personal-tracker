import { Bookmark as BookmarkIcon, Plus, Settings2, X } from "lucide-react";
import { useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { useConfirm } from "../../components/confirm-dialog";
import { IconButton } from "../../components/icon-button";
import { Tooltip } from "../../components/ui/tooltip";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import { cn } from "../../lib/cn";
import { faviconUrl, hostname } from "../../lib/url";
import { BookmarkDialog } from "./bookmark-dialog";
import { GroupManagerDialog } from "./group-manager-dialog";
import { useBookmarks } from "./use-bookmarks";

/** Bookmark tracker: favicon list with optional category filtering. */
export function BookmarkCard({ className }: { className?: string }) {
  const {
    bookmarks,
    groups,
    addGroup,
    addBookmark,
    removeBookmark,
    removeGroup,
    renameGroup,
  } = useBookmarks();
  const [filter, setFilter] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupMgrOpen, setGroupMgrOpen] = useState(false);
  const confirm = useConfirm();
  const locale = useLocale();
  const t = messages[locale].features.bookmarks;

  async function handleRemoveGroup(name: string) {
    const ok = await confirm({
      title: t.deleteGroupTitle(name),
      message: t.deleteGroupMessage,
      confirmLabel: t.deleteGroupConfirm,
      danger: true,
    });
    if (!ok) return;
    removeGroup(name);
    if (filter === name) setFilter("");
  }

  const visible = filter
    ? bookmarks.filter((b) => b.group === filter)
    : bookmarks;

  return (
    <BentoCard
      icon={BookmarkIcon}
      title={t.title}
      scrollBody={false}
      className={className}
      action={
        <>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-full bg-btn pl-3 pr-3.5 text-[13px] font-semibold text-btn-ink transition-colors hover:opacity-90"
          >
            <Plus size={16} />
            {t.addBookmark}
          </button>
          <IconButton
            aria-label={t.manageGroups}
            title={t.manageGroups}
            onClick={() => setGroupMgrOpen(true)}
          >
            <Settings2 size={18} />
          </IconButton>
        </>
      }
    >
      <div className="flex h-full flex-col">
        {groups.length > 0 ? (
          <div className="mb-3 flex gap-1.5 overflow-x-auto">
            <FilterChip active={!filter} onClick={() => setFilter("")}>
              {t.all}
            </FilterChip>
            {groups.map((g) => (
              <FilterChip
                key={g}
                active={filter === g}
                onClick={() => setFilter(g)}
              >
                {g}
              </FilterChip>
            ))}
          </div>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="grid flex-1 place-items-center text-sm text-ink-faint">
              {t.empty}
            </p>
          ) : (
            visible.map((b) => (
              <div
                key={b.id}
                className="group flex items-center gap-3 rounded-[var(--radius-inner)] p-2 transition-colors hover:bg-surface-sunken"
              >
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <img
                    src={faviconUrl(b.url)}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5 shrink-0 rounded"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {b.title}
                    </span>
                    <span className="block truncate text-xs text-ink-faint">
                      {hostname(b.url)}
                    </span>
                  </span>
                  {b.group ? (
                    <span className="shrink-0 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-soft">
                      {b.group}
                    </span>
                  ) : null}
                </a>
                <Tooltip label={t.deleteBookmark}>
                  <button
                    type="button"
                    aria-label={t.deleteBookmark}
                    onClick={() => removeBookmark(b.id)}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint opacity-0 transition hover:bg-surface-hover hover:text-ink group-hover:opacity-100"
                  >
                    <X size={15} />
                  </button>
                </Tooltip>
              </div>
            ))
          )}
        </div>
      </div>

      <BookmarkDialog
        open={dialogOpen}
        groups={groups}
        onClose={() => setDialogOpen(false)}
        onSubmit={addBookmark}
      />

      <GroupManagerDialog
        open={groupMgrOpen}
        groups={groups}
        onClose={() => setGroupMgrOpen(false)}
        onAdd={addGroup}
        onRename={renameGroup}
        onRemove={handleRemoveGroup}
      />
    </BentoCard>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-accent-strong text-white"
          : "bg-surface-muted text-ink-soft hover:bg-surface-hover",
      )}
    >
      {children}
    </button>
  );
}
