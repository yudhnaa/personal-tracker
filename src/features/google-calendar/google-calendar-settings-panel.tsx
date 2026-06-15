"use client";

import { CalendarClock, ExternalLink, RefreshCw, Unplug } from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import type { UseGoogleCalendarResult } from "./use-google-calendar";

type GoogleCalendarSettingsPanelProps = {
  calendar: UseGoogleCalendarResult;
  locale: Locale;
};

export function GoogleCalendarSettingsPanel({
  calendar,
  locale,
}: GoogleCalendarSettingsPanelProps) {
  const t = messages[locale].components.settings.googleCalendar;
  const connected = calendar.connection.connected && !calendar.connection.reconnectRequired;

  return (
    <section className="space-y-3 rounded-[var(--radius-inner)] bg-surface-sunken p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-ink">
          <CalendarClock size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-ink">{t.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">{t.description}</p>
        </div>
      </div>

      {calendar.error ? (
        <p className="rounded-[var(--radius-inner)] bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-500/15 dark:text-red-200">
          {calendar.connection.reconnectRequired ? t.reconnectPrompt : calendar.error}
        </p>
      ) : null}

      {connected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-inner)] bg-surface px-3 py-2">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                {t.connected}
              </p>
              <p className="truncate text-sm font-semibold text-ink">
                {calendar.connection.googleEmail ?? t.unknownAccount}
              </p>
            </div>
            <button
              type="button"
              onClick={calendar.disconnect}
              className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover"
            >
              <Unplug size={14} />
              {t.disconnect}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
              {t.calendars}
            </p>
            <button
              type="button"
              onClick={calendar.loadCalendars}
              className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
              disabled={calendar.calendarsLoading}
            >
              <RefreshCw size={14} className={calendar.calendarsLoading ? "animate-spin" : ""} />
              {t.refresh}
            </button>
          </div>

          {calendar.calendars.length ? (
            <div className="max-h-44 space-y-1 overflow-y-auto">
              {calendar.calendars.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-inner)] bg-surface px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => calendar.toggleCalendar(item.id)}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.backgroundColor ?? "var(--color-accent)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">{item.summary}</span>
                  {item.primary ? (
                    <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent-ink">
                      {t.primary}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-[var(--radius-inner)] bg-surface px-3 py-2 text-sm text-ink-faint">
              {calendar.calendarsLoading ? t.loadingCalendars : t.noCalendars}
            </p>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={calendar.connect}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-btn px-4 py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
        >
          <ExternalLink size={16} />
          {calendar.connection.reconnectRequired ? t.reconnect : t.connect}
        </button>
      )}
    </section>
  );
}
