"use client";

import { useEffect, useState } from "react";
import { LOCALES, normalizeLocale, messages, type Locale } from "@/lib/i18n";

export function LanguageSwitcher({
	locale,
	onChange,
}: {
	locale: Locale;
	onChange?: (locale: Locale) => void;
}) {
	const [current, setCurrent] = useState(locale);
	const labels = messages[locale].components.languageSwitcher;

	useEffect(() => {
		if (!document.cookie.includes("pt.locale=")) {
			const detected = normalizeLocale(navigator.language);
			setCurrent(detected);
			document.cookie = `pt.locale=${detected}; path=/; max-age=31536000; samesite=lax`;
			onChange?.(detected);
		}
	}, [onChange]);

	function choose(next: Locale) {
		setCurrent(next);
		document.cookie = `pt.locale=${next}; path=/; max-age=31536000; samesite=lax`;
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
						current === item
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
