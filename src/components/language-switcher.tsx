"use client";

import { LOCALES, messages, type Locale } from "@/lib/i18n";

function persistLocale(locale: Locale) {
	document.cookie = `pt.locale=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LanguageSwitcher({
	locale,
	onChange,
}: {
	locale: Locale;
	onChange?: (locale: Locale) => void;
}) {
	const labels = messages[locale].components.languageSwitcher;

	function choose(next: Locale) {
		persistLocale(next);
		onChange?.(next);
		window.location.reload();
	}

	return (
		<div className="inline-flex rounded-full bg-surface-muted p-1">
			{LOCALES.map((item) => (
				<button
					key={item}
					type="button"
					onClick={() => choose(item)}
					className={`h-8 rounded-full px-3 text-sm font-semibold uppercase ${
					locale === item
							? "bg-btn text-btn-ink"
							: "text-ink-soft hover:text-ink"
					}`}
				>
					{labels[item]}
				</button>
			))}
		</div>
	);
}
