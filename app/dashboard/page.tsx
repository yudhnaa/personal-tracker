import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardClient } from "@/components/dashboard-client";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function DashboardPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session) redirect("/login");
	const locale = await getRequestLocale();

	return (
		<DashboardClient
			userEmail={session.user.email}
			initialLocale={locale}
		/>
	);
}
