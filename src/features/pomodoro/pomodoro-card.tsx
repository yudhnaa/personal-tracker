import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { BentoCard } from "../../components/bento-card";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { usePomodoro } from "./use-pomodoro";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

/** Pomodoro timer with fixed 25/5 and 50/10 presets and a progress ring. */
export function PomodoroCard({
  className,
  editMode,
  onHide,
}: {
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
}) {
  const p = usePomodoro();
  const mm = String(Math.floor(p.secondsLeft / 60)).padStart(2, "0");
  const ss = String(p.secondsLeft % 60).padStart(2, "0");
  const locale = useLocale();
  const t = messages[locale].features.pomodoro;

  return (
    <BentoCard
      icon={Timer}
      title={t.title}
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {p.presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={t.presetTooltip(preset.focus, preset.break)}
              onClick={() => p.selectPreset(preset)}
              className={cn(
                "px-2 py-0.5 rounded-[4px] transition-all text-[11px]",
                p.preset.id === preset.id
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex min-h-full flex-col items-center justify-center py-1">
        {/* Circular Dial Countdown Area */}
        <div className="relative w-40 h-40 flex items-center justify-center my-1">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 160 160">
            {/* Background Hairline Ring */}
            <circle cx="80" cy="80" fill="transparent" r="68" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="4" />
            {/* Active Progress Stroke */}
            <circle
              className="transition-all duration-1000 ease-linear"
              cx="80"
              cy="80"
              fill="transparent"
              r="68"
              stroke={p.phase === "focus" ? "#15803D" : "#0284c7"}
              strokeDasharray="427.26"
              strokeDashoffset={427.26 * (1 - p.progress)}
              strokeLinecap="round"
              strokeWidth="4"
            />
          </svg>
          {/* Center Digital Time Display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500">
              {p.phase === "focus" ? t.stateFocus : t.stateBreak}
            </span>
            <span className="text-3xl font-semibold font-mono tracking-tight text-slate-900 dark:text-slate-100 mt-0.5 tabular-nums">
              {mm}:{ss}
            </span>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            onClick={p.toggle}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#0f172a] dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 rounded-md text-xs font-semibold shadow-xs min-w-[76px] justify-center transition-colors"
          >
            {p.running ? <Pause size={13} /> : <Play size={13} />}
            <span>{p.running ? t.pause : t.start}</span>
          </button>
          <Tooltip label={t.skipTooltip}>
            <button
              type="button"
              aria-label={t.skipTooltip}
              onClick={p.switchPhase}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
            >
              <SkipForward size={14} />
            </button>
          </Tooltip>
          <Tooltip label={t.resetTooltip}>
            <button
              type="button"
              aria-label={t.resetTooltip}
              onClick={p.reset}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors"
            >
              <RotateCcw size={14} />
            </button>
          </Tooltip>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2.5 font-medium">
          {t.footer(p.preset.focus, p.preset.break)}
        </p>
      </div>
    </BentoCard>
  );
}
