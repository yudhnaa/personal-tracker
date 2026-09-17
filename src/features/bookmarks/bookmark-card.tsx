import { Bookmark as BookmarkIcon, Plus, Settings2, X } from "lucide-react";
import { useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { useConfirm } from "../../components/confirm-dialog";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import { cn } from "../../lib/cn";
import { hostname } from "../../lib/url";
import { BookmarkDialog } from "./bookmark-dialog";
import { GroupManagerDialog } from "./group-manager-dialog";
import { useBookmarks } from "./use-bookmarks";

/** Bookmark tracker: favicon list with optional category filtering. */
export function BookmarkCard({
  className,
  editMode,
  onHide,
}: {
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
}) {
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
      editMode={editMode}
      onHide={onHide}
      action={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
          >
            <Plus size={13} className="text-slate-500 dark:text-slate-400" />
            <span>{t.addBookmark}</span>
          </button>
          <button
            type="button"
            aria-label={t.manageGroups}
            title={t.manageGroups}
            onClick={() => setGroupMgrOpen(true)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
          >
            <Settings2 size={13} />
          </button>
        </div>
      }
    >
      <div className="flex h-full flex-col">
        {groups.length > 0 ? (
          <div className="mb-2.5 flex gap-1.5 overflow-x-auto pb-1">
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

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5 custom-scrollbar">
          {visible.length === 0 ? (
            <p className="grid flex-1 place-items-center text-xs text-slate-400 dark:text-slate-500">
              {t.empty}
            </p>
          ) : (
            visible.map((b) => (
              <div
                key={b.id}
                className="group flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 transition-colors"
              >
                <a
                  href={b.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 min-w-0 flex-1"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                  <span className="truncate font-medium text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white">
                    {b.title}
                  </span>
                  {b.group ? (
                    <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                      {b.group}
                    </span>
                  ) : null}
                </a>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                    {hostname(b.url)}
                  </span>
                  <button
                    type="button"
                    aria-label={t.deleteBookmark}
                    onClick={() => removeBookmark(b.id)}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity p-0.5"
                  >
                    <X size={13} />
                  </button>
                </div>
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
        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium border transition-colors",
        active
          ? "bg-[#0f172a] dark:bg-slate-100 text-white dark:text-slate-900 border-transparent shadow-2xs font-semibold"
          : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700",
      )}
    >
      {children}
    </button>
  );
}
