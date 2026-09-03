import { VerifyEmailPage } from "@/components/auth/verify-email-page";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function VerifyEmailRoute({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const locale = await getRequestLocale();
  const { token = "" } = await searchParams;
  return <VerifyEmailPage initialLocale={locale} token={token} />;
}
