import { ResetPasswordPage } from "@/components/auth/reset-password-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function ResetPasswordRoute({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getRequestLocale();
  const { token = "" } = await searchParams;
  return <ResetPasswordPage initialLocale={locale} token={token} />;
}
