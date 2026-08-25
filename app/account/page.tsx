import { AuthenticatedAccountPage } from "@/components/auth/authenticated-account-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AccountRoute() {
  const locale = await getRequestLocale();
  return <AuthenticatedAccountPage initialLocale={locale} />;
}
