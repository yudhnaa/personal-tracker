import type { Metadata } from "next";
import "../src/index.css";
import { getRequestLocale } from "@/lib/i18n-server";
import { LocaleProvider } from "@/components/locale-provider";

export const metadata: Metadata = {
  title: "Personal Tracker",
  description: "A private Bento-grid dashboard for everyday planning.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getRequestLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <LocaleProvider value={locale}>
          {children}
        </LocaleProvider>
      </body>
    </html>
  );
}

