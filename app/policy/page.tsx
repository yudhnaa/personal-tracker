import type { Metadata } from "next";
import { PolicyPage } from "@/components/policy-page";
import { getRequestLocale } from "@/lib/i18n-server";

export const metadata: Metadata = {
	title: "Privacy Policy — Personal Tracker",
	description:
		"Privacy Policy and Google API Services User Data Policy compliance statement for Personal Tracker.",
};

export default async function Page() {
	const locale = await getRequestLocale();
	return <PolicyPage initialLocale={locale} />;
}
