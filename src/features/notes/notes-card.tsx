import { NotebookPen, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import { IconButton } from "@/components/icon-button";
import { useConfirm } from "@/components/confirm-dialog";
import type { Note } from "./types";

/** A free-form scratch note card. */
export function NotesCard({
  note,
  className,
  editMode,
  onHide,
  onPatch,
  onDelete,
}: {
  note: Note;
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
  onPatch: (patch: Partial<Pick<Note, "title" | "text">>) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const onPatchRef = useRef(onPatch);

  const text = draft !== null ? draft : note.text;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const locale = useLocale();
  const t = messages[locale].features.notes;
  const confirm = useConfirm();

  useEffect(() => {
    onPatchRef.current = onPatch;
  }, [onPatch]);

  useEffect(() => {
    if (draft === null || draft !== note.text) return;
    const timeout = window.setTimeout(() => setDraft(null), 0);
    return () => window.clearTimeout(timeout);
  }, [draft, note.text]);

  useEffect(() => {
    if (draft === null || draft === note.text) return;
    const timeout = window.setTimeout(() => {
      onPatchRef.current({ text: draft });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [draft, note.text]);

  function commitTitle(input: HTMLInputElement) {
    const clean = input.value.trim() || "Note";
    input.value = clean;
    if (clean !== note.title) onPatch({ title: clean });
  }

  async function handleDelete() {
    const ok = await confirm({
      title: t.deleteTitle(note.title),
      message: t.deleteMessage,
      confirmLabel: t.deleteConfirm,
      danger: true,
    });
    if (ok) onDelete();
  }

  return (
    <BentoCard
      icon={NotebookPen}
      title={note.title || t.title}
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <>
          <span className="text-xs font-medium text-ink-faint">
            {t.wordCount(words)}
          </span>
          <IconButton
            aria-label={t.deleteTooltip}
            title={t.deleteTooltip}
            onClick={handleDelete}
            className="bg-transparent text-ink-faint hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/15"
          >
            <Trash2 size={16} />
          </IconButton>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <input
          key={note.title}
          maxLength={120}
          defaultValue={note.title}
          onBlur={(e) => commitTitle(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              e.currentTarget.value = note.title;
              e.currentTarget.blur();
            }
          }}
          aria-label={t.titleLabel}
          className="h-9 shrink-0 rounded-[var(--radius-inner)] bg-surface-sunken px-3 text-sm font-semibold text-ink outline-none transition-colors placeholder:text-ink-faint focus:ring-2 focus:ring-accent/30"
        />
        <textarea
          maxLength={50_000}
          id={`notes-content-${note.id}`}
          name={`notes-content-${note.id}`}
          value={text}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-0 flex-1 resize-none rounded-[var(--radius-inner)] bg-surface-sunken p-3.5 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/30"
        />
      </div>
    </BentoCard>
  );
}
