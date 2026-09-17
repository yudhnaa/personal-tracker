import { Check, Plus, Repeat, X } from "lucide-react";
import { useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { todayIso } from "../../lib/date";
import { currentStreak, currentWeekDays, useHabits, type Habit } from "./use-habits";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

/** Daily habit tracker: check off today, streak badge, weekly M-T-W-T-F-S-S calendar row. */
export function HabitCard({
  className,
  editMode,
  onHide,
}: {
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
}) {
  const { habits, addHabit, removeHabit, toggleToday } = useHabits();
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const locale = useLocale();
  const t = messages[locale].features.habits;

  async function submit() {
    if (saving || !draft.trim()) return;
    setSaving(true);
    setSaveError(false);
    try {
      const saved = await addHabit(draft);
      if (saved) setDraft("");
      else setSaveError(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BentoCard
      icon={Repeat}
      title={t.title}
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <span className="text-[11px] font-mono text-slate-500">
          {habits.length} {locale === "vi" ? "hoạt động" : "active"}
        </span>
      }
    >
      <div className="flex h-full flex-col justify-between">
        <div className="flex min-h-[170px] flex-1 flex-col gap-2 overflow-y-auto pr-0.5 custom-scrollbar">
          {habits.length === 0 ? (
            <p className="grid flex-1 place-items-center text-center text-xs text-slate-400 whitespace-pre-line py-4">
              {t.empty}
            </p>
          ) : (
            habits.map((h) => (
              <HabitRow
                key={h.id}
                habit={h}
                onToggle={() => toggleToday(h.id)}
                onRemove={() => removeHabit(h.id)}
              />
            ))
          )}
        </div>

        {/* Inline Add Habit Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-2"
        >
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-md p-1 focus-within:border-slate-400 dark:focus-within:border-slate-500 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t.placeholder}
              className="flex-1 text-xs bg-transparent border-0 focus:ring-0 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-2 py-1 outline-none"
            />
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              title={t.addTooltip}
              aria-label={t.addTooltip}
              className="w-7 h-7 flex items-center justify-center rounded-md bg-[#0f172a] dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white active:bg-slate-950 transition-colors shadow-xs shrink-0 disabled:opacity-50"
            >
              <Plus size={14} strokeWidth={2.2} />
            </button>
          </div>
          {saveError ? <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{t.saveError}</p> : null}
        </form>
      </div>
    </BentoCard>
  );
}

function HabitRow({
  habit,
  onToggle,
  onRemove,
}: {
  habit: Habit;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const doneToday = habit.done.includes(todayIso());
  const streak = currentStreak(habit.done);
  const locale = useLocale();
  const t = messages[locale].features.habits;
  const weekDays = currentWeekDays(habit.done, t.weekdays);

  return (
    <div className="p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2 w-full group transition-colors hover:border-slate-300 dark:hover:border-slate-600">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onToggle}
            aria-label={doneToday ? t.unmarkTooltip : t.markTooltip}
            className={cn(
              "w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0",
              doneToday
                ? "bg-[#15803d] text-white"
                : "border border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400"
            )}
          >
            <Check size={11} strokeWidth={3} />
          </button>
          <span className={cn("text-xs font-medium truncate", doneToday ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300")}>
            {habit.name}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          <span className="text-[11px] font-mono font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
            {t.streakDays(streak)}
          </span>
          <Tooltip label={t.deleteTooltip}>
            <button
              type="button"
              onClick={onRemove}
              aria-label={t.deleteTooltip}
              className="text-slate-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 dark:hover:text-rose-400 transition-opacity p-0.5"
            >
              <X size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700 px-0.5">
        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{t.thisWeek}</span>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {weekDays.map((d, i) => (
            <span
              key={i}
              title={d.iso}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center font-medium transition-colors",
                d.done ? "bg-[#15803d] text-white font-semibold" : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              )}
            >
              {d.letter}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
