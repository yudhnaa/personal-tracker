import { NotebookPen } from "lucide-react";
import { useEffect, useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { apiJson } from "../../lib/api-client";
import { useApiState } from "../../lib/use-api-state";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

/** A single free-form scratch note — no editor, no categories, just text. */
export function NotesCard({
  className,
  editMode,
  onHide,
}: {
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
}) {
  // Free text changes on every keystroke — debounce the write so a large note
  // doesn't re-serialize the whole string each key press.
  const { data: serverText, loading, commit, reload } = useApiState<string>("/api/notes", "");
  const [draft, setDraft] = useState<string | null>(null);
  
  const text = draft !== null ? draft : serverText;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const locale = useLocale();
  const t = messages[locale].features.notes;

  useEffect(() => {
    if (draft === null) return;
    const timeout = window.setTimeout(() => {
      void commit(
        apiJson<string>("/api/notes", {
          method: "PATCH",
          body: JSON.stringify({ text: draft }),
        }),
        async () => {
          await reload();
          return draft;
        },
      );
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [commit, reload, draft]);

  return (
    <BentoCard
      icon={NotebookPen}
      title={t.title}
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <span className="text-xs font-medium text-ink-faint">
          {t.wordCount(words)}
        </span>
      }
    >
      <textarea
        id="notes-content"
        name="notes-content"
        value={text}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.placeholder}
        className="h-full w-full resize-none rounded-[var(--radius-inner)] bg-surface-sunken p-3.5 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/30"
      />
    </BentoCard>
  );
}
