import { cookies, headers } from "next/headers";
import { normalizeLocale, type Locale } from "./i18n";

export async function getRequestLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get("pt.locale")?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);
  const acceptLanguage = (await headers()).get("accept-language");
  return normalizeLocale(acceptLanguage);
}
