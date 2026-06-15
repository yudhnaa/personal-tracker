import { AuthPage } from "@/components/auth/auth-page";
import { getRequestLocale } from "@/lib/i18n-server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RegisterPage() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (session) redirect("/dashboard");
	const locale = await getRequestLocale();
	return (
		<AuthPage
			mode="register"
			initialLocale={locale}
		/>
	);
}
