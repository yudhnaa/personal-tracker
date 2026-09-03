import type { Metadata } from "next";
import Script from "next/script";
import "../src/index.css";
import { getRequestLocale } from "@/lib/i18n-server";
import { LocaleProvider } from "@/components/locale-provider";

export const metadata: Metadata = {
  title: "Personal Tracker",
  description: "A private Bento-grid dashboard for everyday planning.",
};

import { QueryProvider } from "@/components/query-provider";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
		<Script id="restore-dashboard-background" strategy="beforeInteractive">
			{`try {
  const background = window.localStorage.getItem("pt_dashboard_background");
  if (background !== null && (background === "" || /^\\/bg(?:-\\d+)?\\.jpg$/.test(background))) {
    document.documentElement.style.setProperty(
      "--initial-dashboard-background",
      background ? 'url("' + background + '")' : "none",
    );
  }
} catch {}`}
		</Script>
        <QueryProvider>
          <LocaleProvider value={locale}>
            {children}
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
