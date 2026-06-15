import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { createId } from "../../lib/id";
import type { ChecklistItem } from "./task-types";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

type TaskChecklistProps = {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
};

/**
 * Trello-style checklist: tick / rename / delete items inline and add new ones,
 * with a progress count + bar. Every change calls onChange so the parent can
 * auto-save (no internal persistence).
 */
export function TaskChecklist({ items, onChange }: TaskChecklistProps) {
  const [draft, setDraft] = useState("");
  const done = items.filter((i) => i.done).length;
  const total = items.length;
  const locale = useLocale();
  const t = messages[locale].features.todo;

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, { id: createId(), text, done: false }]);
    setDraft("");
  }

  const toggle = (id: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const setText = (id: string, text: string) =>
    onChange(items.map((i) => (i.id === id ? { ...i, text } : i)));
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {t.checklist.title}
        </p>
        {total > 0 ? (
          <span className="text-xs font-semibold tabular-nums text-ink-soft">
            {done}/{total}
          </span>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="mb-2 h-1.5 shrink-0 overflow-hidden rounded-full bg-surface-muted">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      ) : null}

      <div className="max-h-[28vh] space-y-0.5 overflow-y-auto pr-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-2 rounded-[0.6rem] px-1.5 py-1 transition-colors hover:bg-surface-sunken"
          >
            <Tooltip label={item.done ? t.checklist.unmark : t.checklist.mark}>
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-label={item.done ? t.checklist.unmark : t.checklist.mark}
                className={cn(
                  "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
                  item.done
                    ? "border-transparent bg-accent-strong text-white"
                    : "border-line text-transparent hover:border-ink-faint",
                )}
              >
                <Check size={12} strokeWidth={3} />
              </button>
            </Tooltip>
            <input
              value={item.text}
              onChange={(e) => setText(item.id, e.target.value)}
              className={cn(
                "min-w-0 flex-1 bg-transparent text-sm text-ink outline-none",
                item.done && "text-ink-faint line-through",
              )}
            />
            <Tooltip label={t.checklist.delete}>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t.checklist.delete}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-faint opacity-0 transition hover:bg-surface-hover hover:text-ink group-hover:opacity-100"
              >
                <X size={14} />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="mt-2 flex shrink-0 items-center gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t.checklist.placeholder}
          className="min-w-0 flex-1 rounded-[0.7rem] bg-surface-sunken px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:ring-2 focus:ring-accent/40"
        />
        <Tooltip label={t.checklist.add}>
          <button
            type="submit"
            aria-label={t.checklist.add}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-btn text-btn-ink transition-colors hover:opacity-90"
          >
            <Plus size={16} />
          </button>
        </Tooltip>
      </form>
    </div>
  );
}
