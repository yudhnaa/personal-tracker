import { en } from "./en";
import { vi } from "./vi";

export type { Messages } from "./en";
export type Locale = "en" | "vi";

export const LOCALES: Locale[] = ["en", "vi"];

export const messages: Record<Locale, typeof en> = { en, vi };

export function normalizeLocale(value: string | undefined | null): Locale {
	return value?.toLowerCase().startsWith("vi") ? "vi" : "en";
}

export function getClientLocale(): Locale {
	if (typeof document !== "undefined") {
		const match = document.cookie.match(/(?:^|;\s*)pt\.locale=([^;]+)/);
		if (match?.[1]) return normalizeLocale(decodeURIComponent(match[1]));
	}
	if (typeof navigator !== "undefined") {
		return normalizeLocale(navigator.language);
	}
	return "en";
}
