import { LandingPage } from "@/components/landing-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function HomePage() {
	const locale = await getRequestLocale();
	return <LandingPage initialLocale={locale} />;
}
