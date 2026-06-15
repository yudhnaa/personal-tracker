import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function ForgotPasswordRoute() {
  const locale = await getRequestLocale();
  return <ForgotPasswordPage initialLocale={locale} />;
}
