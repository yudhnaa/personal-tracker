import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AccountPage } from "@/components/auth/account-page";
import { auth } from "@/lib/auth";
import { getRequestLocale } from "@/lib/i18n-server";

export default async function AccountRoute() {
  const [session, locale] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getRequestLocale(),
  ]);
  if (!session) redirect("/login");
  return <AccountPage email={session.user.email} initialLocale={locale} />;
}
