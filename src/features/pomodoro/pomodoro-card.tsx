import { Pause, Play, RotateCcw, SkipForward, Timer } from "lucide-react";
import { BentoCard } from "../../components/bento-card";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { usePomodoro } from "./use-pomodoro";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

/** Pomodoro timer with fixed 25/5 and 50/10 presets and a progress ring. */
export function PomodoroCard({ className }: { className?: string }) {
  const p = usePomodoro();
  const mm = String(Math.floor(p.secondsLeft / 60)).padStart(2, "0");
  const ss = String(p.secondsLeft % 60).padStart(2, "0");
  const locale = useLocale();
  const t = messages[locale].features.pomodoro;

  const radius = 56;
  const circ = 2 * Math.PI * radius;

  return (
    <BentoCard
      icon={Timer}
      title={t.title}
      scrollBody={false}
      className={className}
      action={
        <div className="flex items-center gap-1 rounded-full bg-surface-muted p-1">
          {p.presets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={t.presetTooltip(preset.focus, preset.break)}
              onClick={() => p.selectPreset(preset)}
              className={cn(
                "h-7 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium transition-colors",
                p.preset.id === preset.id
                  ? "bg-surface text-ink"
                  : "text-ink-soft hover:text-ink",
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      }
    >
      <div className="flex min-h-full flex-col items-center justify-center gap-3 py-1">
        <div className="relative grid place-items-center">
          <svg width="132" height="132" className="-rotate-90">
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              strokeWidth="8"
              className="stroke-surface-muted"
            />
            <circle
              cx="66"
              cy="66"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - p.progress)}
              className={cn(
                "transition-[stroke-dashoffset] duration-500",
                p.phase === "focus" ? "stroke-accent" : "stroke-sky-400",
              )}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span
              className={cn(
                "mb-0.5 text-[11px] font-semibold uppercase tracking-wide",
                p.phase === "focus" ? "text-accent-ink" : "text-sky-600",
              )}
            >
              {p.phase === "focus" ? t.stateFocus : t.stateBreak}
            </span>
            <span className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
              {mm}:{ss}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={p.toggle}
            className="flex h-10 items-center gap-2 rounded-full bg-btn pl-4 pr-5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
          >
            {p.running ? <Pause size={16} /> : <Play size={16} />}
            {p.running ? t.pause : t.start}
          </button>
          <Tooltip label={t.skipTooltip}>
            <button
              type="button"
              aria-label={t.skipTooltip}
              onClick={p.switchPhase}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <SkipForward size={16} />
            </button>
          </Tooltip>
          <Tooltip label={t.resetTooltip}>
            <button
              type="button"
              aria-label={t.resetTooltip}
              onClick={p.reset}
              className="grid h-10 w-10 place-items-center rounded-full bg-surface-muted text-ink-soft transition-colors hover:bg-surface-hover hover:text-ink"
            >
              <RotateCcw size={16} />
            </button>
          </Tooltip>
        </div>

        <p className="text-xs text-ink-faint">
          {t.footer(p.preset.focus, p.preset.break)}
        </p>
      </div>
    </BentoCard>
  );
}
