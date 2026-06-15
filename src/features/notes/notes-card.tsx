import { NotebookPen } from "lucide-react";
import { useEffect } from "react";
import { BentoCard } from "../../components/bento-card";
import { apiJson } from "../../lib/api-client";
import { useApiState } from "../../lib/use-api-state";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

/** A single free-form scratch note — no editor, no categories, just text. */
export function NotesCard({ className }: { className?: string }) {
  // Free text changes on every keystroke — debounce the write so a large note
  // doesn't re-serialize the whole string each key press.
  const { data: text, setData: setText, loading, commit, reload } = useApiState<string>("/api/notes", "");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const locale = useLocale();
  const t = messages[locale].features.notes;

  useEffect(() => {
    if (loading) return;
    const timeout = window.setTimeout(() => {
      void commit(
        apiJson<string>("/api/notes", {
          method: "PATCH",
          body: JSON.stringify({ text }),
        }),
        async () => {
          await reload();
          return text;
        },
      );
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [commit, loading, reload, text]);

  return (
    <BentoCard
      icon={NotebookPen}
      title={t.title}
      scrollBody={false}
      className={className}
      action={
        <span className="text-xs font-medium text-ink-faint">
          {t.wordCount(words)}
        </span>
      }
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t.placeholder}
        className="h-full w-full resize-none rounded-[var(--radius-inner)] bg-surface-sunken p-3.5 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-faint focus:bg-surface-sunken focus:ring-2 focus:ring-accent/30"
      />
    </BentoCard>
  );
}
