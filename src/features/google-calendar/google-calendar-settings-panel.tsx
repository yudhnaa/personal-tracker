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
  const connections = calendar.connection.connections;

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
          {connections.some((connection) => connection.reconnectRequired) ? t.reconnectPrompt : calendar.error}
        </p>
      ) : null}

      {connections.length ? (
        <div className="space-y-3">
          {connections.map((connection) => {
            const accountCalendars = calendar.calendars.filter((item) => item.connectionId === connection.id);
            const healthy = connection.connected && !connection.reconnectRequired;
            return (
              <div key={connection.id} className="space-y-3 rounded-[var(--radius-inner)] bg-surface p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                      {healthy ? t.connected : t.reconnectPrompt}
                    </p>
                    <p className="truncate text-sm font-semibold text-ink">
                      {connection.googleEmail || t.unknownAccount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {connection.reconnectRequired ? (
                      <button
                        type="button"
                        onClick={calendar.connect}
                        className="flex items-center gap-1.5 rounded-full bg-btn px-3 py-1.5 text-xs font-semibold text-btn-ink transition-colors hover:opacity-90"
                      >
                        <ExternalLink size={14} />
                        {t.reconnect}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void calendar.disconnect(connection.id)}
                      className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover"
                    >
                      <Unplug size={14} />
                      {t.disconnect}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">
                    {t.calendars}
                  </p>
                  <button
                    type="button"
                    onClick={() => void calendar.loadCalendars()}
                    className="flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-60"
                    disabled={calendar.calendarsLoading || !healthy}
                  >
                    <RefreshCw size={14} className={calendar.calendarsLoading ? "animate-spin" : ""} />
                    {t.refresh}
                  </button>
                </div>

                {healthy && accountCalendars.length ? (
                  <div className="max-h-44 space-y-1 overflow-y-auto">
                    {accountCalendars.map((item) => (
                      <label
                        key={`${item.connectionId}:${item.id}`}
                        className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2 text-sm text-ink transition-colors hover:bg-surface-muted"
                      >
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => calendar.toggleCalendar(item.connectionId, item.id)}
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
                  <p className="rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2 text-sm text-ink-faint">
                    {calendar.calendarsLoading ? t.loadingCalendars : t.noCalendars}
                  </p>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={calendar.connect}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-btn px-4 py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
          >
            <ExternalLink size={16} />
            {t.connectAnother}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={calendar.connect}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-btn px-4 py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
        >
          <ExternalLink size={16} />
          {t.connect}
        </button>
      )}
    </section>
  );
}
