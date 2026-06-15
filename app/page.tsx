import { LandingPage } from "@/components/landing-page";
import { getRequestLocale } from "@/lib/i18n-server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function HomePage() {
	const locale = await getRequestLocale();
	const session = await auth.api.getSession({ headers: await headers() });
	return (
		<LandingPage
			initialLocale={locale}
			isLoggedIn={!!session}
		/>
	);
}
