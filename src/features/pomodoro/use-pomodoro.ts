import { useEffect, useRef, useState } from "react";
import { ensureNotifyPermission, notify, playChime } from "../../lib/notify";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";

export type Phase = "focus" | "break";

export type Preset = {
  id: string;
  label: string;
  focus: number; // minutes
  break: number; // minutes
};

/** Countdown timer that auto-flips between focus and break phases. */
export function usePomodoro() {
  const locale = useLocale();
  const t = messages[locale].features.pomodoro;

  const presets: Preset[] = [
    { id: "classic", label: locale === "vi" ? "Cổ điển" : "Classic", focus: 25, break: 5 },
    { id: "deep", label: locale === "vi" ? "Chuyên sâu" : "Deep focus", focus: 50, break: 10 },
  ];

  const [presetId, setPresetId] = useState<string>("classic");
  const preset = presets.find((p) => p.id === presetId) ?? presets[0];

  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(preset.focus * 60);
  const [running, setRunning] = useState(false);
  const tick = useRef<number | null>(null);

  const total = (phase === "focus" ? preset.focus : preset.break) * 60;

  useEffect(() => {
    if (!running) return;
    tick.current = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (tick.current) window.clearInterval(tick.current);
    };
  }, [running]);

  // Phase rollover when the countdown hits zero — chime + system notification.
  useEffect(() => {
    if (secondsLeft > 0) return;
    setRunning(false);
    playChime();
    if (phase === "focus") {
      notify(t.notifyFocusEndTitle, t.notifyFocusEndBody(preset.break));
      switchTo("break");
    } else {
      notify(t.notifyBreakEndTitle, t.notifyBreakEndBody(preset.focus));
      switchTo("focus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function switchTo(next: Phase) {
    setPhase(next);
    setSecondsLeft((next === "focus" ? preset.focus : preset.break) * 60);
  }

  function selectPreset(next: Preset) {
    setPresetId(next.id);
    setRunning(false);
    setPhase("focus");
    setSecondsLeft(next.focus * 60);
  }

  function reset() {
    setRunning(false);
    setSecondsLeft(total);
  }

  return {
    preset,
    presets,
    phase,
    secondsLeft,
    total,
    running,
    progress: 1 - secondsLeft / total,
    toggle: () => {
      ensureNotifyPermission();
      setRunning((r) => !r);
    },
    reset,
    selectPreset,
    switchPhase: () => switchTo(phase === "focus" ? "break" : "focus"),
  };
}
