import { Plus, X } from "lucide-react";
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
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {t.checklist.title}
        </label>
        {total > 0 ? (
          <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
            {done}/{total}
          </span>
        ) : null}
      </div>

      {total > 0 ? (
        <div className="mb-2.5 h-1.5 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      ) : null}

      {/* Add subtask input field */}
      <div className="flex items-center gap-2 mb-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t.checklist.placeholder}
          className="flex-1 h-11 px-3.5 bg-[#f8fafc] dark:bg-slate-800/80 border border-[#e2e8f0] dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-slate-400 focus:border-slate-900 dark:focus:border-slate-400 transition-colors"
        />
        <button
          type="button"
          onClick={add}
          aria-label={t.checklist.add}
          className="w-11 h-11 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg flex items-center justify-center hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Subtasks List */}
      <div className="max-h-[28vh] space-y-1.5 overflow-y-auto pr-0.5">
        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 transition"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggle(item.id)}
                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 focus:ring-0 cursor-pointer"
              />
              <input
                value={item.text}
                onChange={(e) => setText(item.id, e.target.value)}
                className={cn(
                  "min-w-0 flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none",
                  item.done && "text-slate-400 dark:text-slate-500 line-through",
                )}
              />
            </div>
            <Tooltip label={t.checklist.delete}>
              <button
                type="button"
                onClick={() => remove(item.id)}
                aria-label={t.checklist.delete}
                className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-0.5 rounded transition shrink-0"
              >
                <X size={14} />
              </button>
            </Tooltip>
          </div>
        ))}
      </div>
    </div>
  );
}
