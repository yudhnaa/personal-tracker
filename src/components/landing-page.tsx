"use client";

import Link from "next/link";
import { CheckCircle2, Clock3, FolderHeart, KanbanSquare } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { messages, type Locale } from "@/lib/i18n";

const icons = [KanbanSquare, FolderHeart, CheckCircle2];

export function LandingPage({
	initialLocale,
	isLoggedIn,
}: {
	initialLocale: Locale;
	isLoggedIn?: boolean;
}) {
	const [locale, setLocale] = useState(initialLocale);
	const t = messages[locale];

	return (
		<main className="min-h-screen bg-surface text-ink">
			<section className="relative min-h-[92vh] overflow-hidden bg-[url('/bg-8.jpg')] bg-cover bg-center">
				<div className="absolute inset-0 bg-black/45" />
				<nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-white">
					<Link
						href="/"
						className="flex items-center gap-2 text-base font-semibold"
					>
						<Clock3 size={19} />
						Personal Tracker
					</Link>
					<div className="flex items-center gap-3">
						<LanguageSwitcher
							locale={locale}
							onChange={setLocale}
						/>
						{isLoggedIn ? (
							<Link
								className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
								href="/dashboard"
							>
								{t.nav.dashboard}
							</Link>
						) : (
							<Link
								className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950"
								href="/login"
							>
								{t.nav.login}
							</Link>
						)}
					</div>
				</nav>
				<div className="relative z-10 mx-auto flex min-h-[calc(92vh-5rem)] max-w-6xl flex-col justify-center px-5 pb-24 pt-16 text-white">
					<p className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/75">
						{t.landing.eyebrow}
					</p>
					<h1 className="max-w-3xl text-5xl font-semibold leading-tight sm:text-6xl">
						{t.landing.title}
					</h1>
					<p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">
						{t.landing.subtitle}
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							href="/dashboard"
							className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-zinc-950"
						>
							{t.landing.primary}
						</Link>
						{!isLoggedIn && (
							<Link
								href="/register"
								className="rounded-full border border-white/45 px-5 py-3 text-sm font-semibold text-white"
							>
								{t.landing.secondary}
							</Link>
						)}
					</div>
				</div>
			</section>
			<section className="mx-auto grid max-w-6xl gap-4 px-5 py-10 md:grid-cols-3">
				{t.landing.sections.map((title, index) => {
					const Icon = icons[index];
					return (
						<article
							key={title}
							className="rounded-[var(--radius-card)] border border-line bg-surface-sunken p-5"
						>
							<Icon
								size={22}
								className="mb-5 text-accent-strong"
							/>
							<h2 className="text-xl font-semibold">{title}</h2>
							<p className="mt-3 text-sm leading-6 text-ink-soft">
								{t.landing.body[index]}
							</p>
						</article>
					);
				})}
			</section>
		</main>
	);
}
