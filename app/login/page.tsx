import { AuthPage } from "@/components/auth/auth-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
	const locale = await getRequestLocale();
	return (
		<AuthPage
			mode="login"
			initialLocale={locale}
		/>
	);
}
