import { Check, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { TextField } from "../../components/form-controls";
import { IconButton } from "../../components/icon-button";
import { Modal } from "../../components/modal";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type GroupManagerDialogProps = {
  open: boolean;
  groups: string[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onRename: (from: string, to: string) => void;
  onRemove: (name: string) => void;
};

/** Manage the bookmark group list: add, rename inline, delete. */
export function GroupManagerDialog({
  open,
  groups,
  onClose,
  onAdd,
  onRename,
  onRemove,
}: GroupManagerDialogProps) {
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const locale = useLocale();
  const t = messages[locale].features.bookmarks.manager;

  function startEdit(name: string) {
    setEditing(name);
    setDraft(name);
  }

  function commitEdit() {
    if (editing) onRename(editing, draft);
    setEditing(null);
  }

  function addGroup() {
    const clean = newName.trim();
    if (!clean) return;
    onAdd(clean);
    setNewName("");
  }

  return (
    <Modal open={open} title={t.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          {groups.length === 0 ? (
            <p className="py-2 text-center text-sm text-ink-faint">
              {t.empty}
            </p>
          ) : (
            groups.map((g) => (
              <div
                key={g}
                className="flex items-center gap-2 rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2"
              >
                {editing === g ? (
                  <>
                    <input
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
                    />
                    <IconButton
                      aria-label={t.saveName}
                      title={t.saveName}
                      onClick={commitEdit}
                      className="h-7 w-7"
                    >
                      <Check size={15} />
                    </IconButton>
                    <IconButton
                      aria-label={t.cancel}
                      title={t.cancel}
                      onClick={() => setEditing(null)}
                      className="h-7 w-7"
                    >
                      <X size={15} />
                    </IconButton>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(g)}
                      title={t.rename}
                      className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink"
                    >
                      {g}
                    </button>
                    <IconButton
                      aria-label={t.deleteGroup}
                      title={t.deleteGroup}
                      onClick={() => onRemove(g)}
                      className="h-7 w-7 text-ink-faint hover:text-red-600"
                    >
                      <Trash2 size={15} />
                    </IconButton>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-line pt-4">
          <TextField
            placeholder={t.newGroupPlaceholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addGroup()}
          />
          <button
            type="button"
            onClick={addGroup}
            className="flex h-[42px] shrink-0 items-center gap-1.5 rounded-full bg-btn px-4 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
          >
            <Plus size={16} />
            {t.add}
          </button>
        </div>
      </div>
    </Modal>
  );
}
