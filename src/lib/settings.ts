import type { ResponsiveLayouts } from "react-grid-layout";

/** Per-browser personalization for the dashboard (board title, theme, etc). */

export type ThemeMode = "light" | "dark";

export type Settings = {
  boardTitle: string;
  theme: ThemeMode;
  /** Primary/accent colour as a hex string; drives every highlight. */
  primary: string;
  /** Background image path under /public, or "" for a plain backdrop. */
  background: string;
  /** Hide done tasks completed more than N days ago; 0 = never hide. */
  archiveDays: number;
  layout: ResponsiveLayouts | null;
  hiddenCards: string[];
};

export const DEFAULT_SETTINGS: Settings = {
  boardTitle: "Personal Tracker",
  theme: "light",
  primary: "#15803d",
  background: "",
  archiveDays: 90,
  layout: {
    lg: [
      { i: "todo", x: 0, y: 0, w: 8, h: 20 },
      { i: "pomodoro", x: 8, y: 0, w: 4, h: 14 },
      { i: "notes", x: 8, y: 14, w: 4, h: 10 },
      { i: "subscriptions", x: 0, y: 20, w: 4, h: 14 },
      { i: "habits", x: 4, y: 20, w: 4, h: 14 },
      { i: "bookmarks", x: 8, y: 24, w: 4, h: 10 },
    ],
  },
  hiddenCards: [],
};

/** Choices for the auto-hide threshold (Settings). */
export const ARCHIVE_DAY_OPTIONS = [
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
  { label: "180 ngày", value: 180 },
  { label: "1 năm", value: 365 },
  { label: "Không ẩn", value: 0 },
];

/** Choices for the manual "purge old done tasks" action (Settings). */
export const PURGE_DAY_OPTIONS = [
  { label: "30 ngày", value: 30 },
  { label: "90 ngày", value: 90 },
  { label: "180 ngày", value: 180 },
  { label: "1 năm", value: 365 },
];

/** Push the current settings into the DOM (theme class). */
export function applySettings(s: Settings) {
  const root = document.documentElement;
  const isDark = s.theme === "dark";
  root.classList.toggle("dark", isDark);
  try {
    window.localStorage.removeItem("pt_dashboard_background");
    document.body.style.backgroundImage = "none";
  } catch {
    // ignore
  }
}
