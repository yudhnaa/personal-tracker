import { DashboardClient } from "@/components/dashboard-client";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function DashboardPage() {
	const locale = await getRequestLocale();

	return <DashboardClient initialLocale={locale} />;
}
