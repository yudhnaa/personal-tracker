"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({
	children,
	value,
}: {
	children: React.ReactNode;
	value: Locale;
}) {
	return (
		<LocaleContext.Provider value={value}>
			{children}
		</LocaleContext.Provider>
	);
}

export function useLocale() {
	return useContext(LocaleContext);
}
