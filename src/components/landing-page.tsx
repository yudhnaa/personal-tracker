"use client";

import Link from "next/link";
import Image from "next/image";
import {
	CheckCircle2,
	ChevronRight,
	FolderHeart,
	KanbanSquare,
	ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "./language-switcher";
import { messages, type Locale } from "@/lib/i18n";
import { useCurrentAccount } from "@/lib/use-required-account";

export function LandingPage({
	initialLocale,
}: {
	initialLocale: Locale;
}) {
	const [locale, setLocale] = useState(initialLocale);
	const account = useCurrentAccount();
	const isLoggedIn = Boolean(account.data);
	const t = messages[locale];

	return (
		<main className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
			{/* Top Navigation */}
			<header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					{/* Brand Logo & Main Nav */}
					<div className="flex items-center space-x-8">
						<Link href="/" className="flex items-center space-x-2.5 group">
							<div className="w-8 h-8 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center p-0.5 shadow-2xs group-hover:border-slate-300 transition-colors">
								<Image
									src="/logo.png"
									alt="Personal Tracker"
									width={28}
									height={28}
									priority
									className="object-contain"
								/>
							</div>
							<span className="font-semibold text-slate-900 tracking-tight text-[15px]">
								Personal Tracker
							</span>
						</Link>
					</div>

					{/* Right Action Items */}
					<div className="flex items-center space-x-3 sm:space-x-4">
						{isLoggedIn ? (
							<Link
								href="/dashboard"
								className="inline-flex items-center justify-center bg-[#15803D] hover:bg-[#166534] text-white text-xs sm:text-[13px] font-medium px-4 py-2 rounded-lg shadow-xs transition-all"
							>
								{t.nav.dashboard}
								<ChevronRight size={14} className="ml-1" />
							</Link>
						) : (
							<>
								<Link
									href="/login"
									className="text-xs sm:text-[13px] font-medium text-slate-700 hover:text-slate-950 px-2 py-1 transition-colors"
								>
									{t.nav.login}
								</Link>
								<Link
									href="/register"
									className="inline-flex items-center justify-center bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-[13px] font-medium px-4 py-2 rounded-lg shadow-xs transition-all hover:shadow"
								>
									{t.landing.secondary}
									<ChevronRight size={14} className="ml-1" />
								</Link>
							</>
						)}

						<div className="h-4 w-px bg-slate-200" />

						<LanguageSwitcher locale={locale} onChange={setLocale} />
					</div>
				</div>
			</header>

			{/* Hero Section with Backdrop */}
			<section className="relative bg-slate-950 text-white pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden">
				{/* Background Photographic Atmosphere */}
				<div
					className="absolute inset-0 w-full h-full bg-cover bg-center opacity-40 pointer-events-none"
					style={{
						backgroundImage: "url('/bg-6.jpg')",
					}}
				/>
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-900/75 to-slate-950/95" />

				<div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
					{/* Status Pill Badge */}
					<div className="inline-flex items-center space-x-2 bg-slate-900/80 border border-white/20 rounded-full px-3.5 py-1 text-xs font-medium tracking-wide uppercase text-emerald-400 mb-6 backdrop-blur-sm shadow-xs">
						<span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
						<span className="text-[11px] font-semibold tracking-wider text-emerald-300">
							{t.landing.eyebrow}
						</span>
					</div>

					{/* Hero Headline */}
					<h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-5 drop-shadow-sm">
						{t.landing.title}
					</h1>

					{/* Hero Subtitle */}
					<p className="max-w-2xl text-base sm:text-lg md:text-xl text-slate-200 font-normal leading-relaxed mb-8 drop-shadow">
						{t.landing.subtitle}
					</p>

					{/* CTA Buttons */}
					<div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-7">
						<Link
							href="/dashboard"
							className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-colors"
						>
							{t.landing.primary}
						</Link>
						{!isLoggedIn && (
							<Link
								href="/login"
								className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-medium border border-white/25 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors"
							>
								{t.nav.login}
							</Link>
						)}
					</div>

					{/* Trust & Privacy Indicators */}
					<div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-300 font-medium">
						<span className="flex items-center">
							<ShieldCheck size={14} className="mr-1 text-emerald-400" />
							{t.landing.trust.privateSync}
						</span>
						<span className="text-slate-500">•</span>
						<span>{t.landing.trust.noTrackers}</span>
						<span className="text-slate-500">•</span>
						<span>{t.landing.trust.freeForever}</span>
					</div>
				</div>
			</section>

			{/* Floating Value Pillar Strip */}
			<section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20">
				<div className="bg-white rounded-xl border border-slate-200 shadow-md p-4 sm:p-5 md:py-5 md:px-7">
					<div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
						{/* Pillar Highlight Info */}
						<div className="flex items-center space-x-3.5 pr-6 lg:border-r border-slate-200/80">
							<div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
								PT
							</div>
							<div>
								<div className="flex items-center space-x-2">
									<span className="text-sm font-semibold text-slate-900">
										{t.landing.floatingPillar.title}
									</span>
									<span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
										{t.landing.floatingPillar.badge}
									</span>
								</div>
								<p className="text-xs text-slate-500">
									{t.landing.floatingPillar.subtitle}
								</p>
							</div>
						</div>

						{/* 4 Value Metrics / Capabilities Grid */}
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 flex-1">
							<div className="space-y-0.5">
								<span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
									{t.landing.floatingPillar.kanbanTitle}
								</span>
								<p className="text-sm font-semibold text-slate-900">
									{t.landing.floatingPillar.kanbanValue}
								</p>
							</div>
							<div className="space-y-0.5">
								<span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
									{t.landing.floatingPillar.pomodoroTitle}
								</span>
								<p className="text-sm font-semibold text-emerald-700 font-mono tabular-nums">
									{t.landing.floatingPillar.pomodoroValue}
								</p>
							</div>
							<div className="space-y-0.5">
								<span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
									{t.landing.floatingPillar.habitsTitle}
								</span>
								<p className="text-sm font-semibold text-slate-900">
									{t.landing.floatingPillar.habitsValue}
								</p>
							</div>
							<div className="space-y-0.5">
								<span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
									{t.landing.floatingPillar.subsTitle}
								</span>
								<p className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
									{t.landing.floatingPillar.subsValue}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Core Feature Showcase (3 Interactive Cards) */}
			<section
				className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20"
				id="features"
			>
				<div className="mb-10 text-left">
					<span className="text-xs font-bold tracking-wider text-slate-500 uppercase block mb-1">
						{t.landing.featureHeading.eyebrow}
					</span>
					<h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
						{t.landing.featureHeading.title}
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
					{/* CARD 1: Plan the day (Kanban) */}
					<div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
						<div>
							<div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#15803D] mb-5">
								<KanbanSquare size={18} />
							</div>
							<h3 className="text-base font-semibold text-slate-900 mb-2">
								{t.landing.sections[0]}
							</h3>
							<p className="text-xs text-slate-500 leading-relaxed mb-6">
								{t.landing.body[0]}
							</p>
						</div>

						{/* Visual Kanban Preview */}
						<div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 space-y-2">
							<div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200/60 font-medium">
								<span className="text-slate-600">{t.landing.featurePreviews.kanbanTitle}</span>
								<span className="text-[#15803D] font-semibold">{t.landing.featurePreviews.kanbanCols}</span>
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
								<span className="font-medium text-slate-800 truncate pr-2">
									{t.landing.featurePreviews.taskReview}
								</span>
								<span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded">
									{t.landing.featurePreviews.statusDoing}
								</span>
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
								<span className="font-medium text-slate-800 truncate pr-2">
									{t.landing.featurePreviews.taskSync}
								</span>
								<span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 rounded">
									{t.landing.featurePreviews.statusDone}
								</span>
							</div>
						</div>
					</div>

					{/* CARD 2: Keep useful links (Scratchpad & Bookmarks) */}
					<div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
						<div>
							<div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#15803D] mb-5">
								<FolderHeart size={18} />
							</div>
							<h3 className="text-base font-semibold text-slate-900 mb-2">
								{t.landing.sections[1]}
							</h3>
							<p className="text-xs text-slate-500 leading-relaxed mb-6">
								{t.landing.body[1]}
							</p>
						</div>

						{/* Visual Scratchpad Preview */}
						<div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 space-y-2">
							<div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200/60 font-medium">
								<span className="text-slate-600">{t.landing.featurePreviews.scratchpadTitle}</span>
								<span className="text-emerald-600 font-semibold flex items-center text-[10px]">
									<span className="w-1.5 h-1.5 bg-[#15803D] rounded-full mr-1" /> {t.landing.featurePreviews.autosaved}
								</span>
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 text-xs font-mono text-slate-700 truncate shadow-2xs flex items-center">
								<span className="text-slate-400 mr-1.5">•</span> {t.landing.featurePreviews.repoItem}
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 text-xs font-mono text-slate-700 truncate shadow-2xs flex items-center">
								<span className="text-slate-400 mr-1.5">•</span> {t.landing.featurePreviews.designItem}
							</div>
						</div>
					</div>

					{/* CARD 3: Build steady habits (Habits & Subscriptions) */}
					<div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 transition-all">
						<div>
							<div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#15803D] mb-5">
								<CheckCircle2 size={18} />
							</div>
							<h3 className="text-base font-semibold text-slate-900 mb-2">
								{t.landing.sections[2]}
							</h3>
							<p className="text-xs text-slate-500 leading-relaxed mb-6">
								{t.landing.body[2]}
							</p>
						</div>

						{/* Visual Habit & Subs Preview */}
						<div className="bg-slate-50/80 border border-slate-200/80 rounded-lg p-3 space-y-2">
							<div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200/60 font-medium">
								<span className="text-slate-600">{t.landing.featurePreviews.habitsTitle}</span>
								<span className="text-slate-600 font-semibold font-mono tabular-nums">
									{t.landing.featurePreviews.subsCount}
								</span>
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
								<span className="font-medium text-slate-800">
									{t.landing.featurePreviews.habitRead}
								</span>
								<div className="flex space-x-1">
									<span className="w-4 h-4 rounded bg-[#15803D] text-white flex items-center justify-center text-[10px]">
										✓
									</span>
									<span className="w-4 h-4 rounded bg-[#15803D] text-white flex items-center justify-center text-[10px]">
										✓
									</span>
									<span className="w-4 h-4 rounded bg-[#15803D] text-white flex items-center justify-center text-[10px]">
										✓
									</span>
								</div>
							</div>
							<div className="bg-white p-2.5 rounded-md border border-slate-200 shadow-2xs flex items-center justify-between text-xs">
								<span className="text-slate-700">{t.landing.featurePreviews.subsExpense}</span>
								<span className="font-semibold text-emerald-700 font-mono tabular-nums">
									118,000₫
								</span>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Site Footer */}
			<footer className="border-t border-slate-200 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
					{/* Brand Copyright & Motto */}
					<div className="flex items-center space-x-3">
						<div className="w-6 h-6 rounded-md bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-2xs">
							<Image
								src="/logo.png"
								alt="Personal Tracker"
								width={20}
								height={20}
								className="object-contain"
							/>
						</div>
						<span className="font-semibold text-slate-800">Personal Tracker</span>
						<span className="text-slate-300">—</span>
						<span>{t.landing.footer.tagline}</span>
					</div>

					{/* Footer Policy & Version Links */}
					<div className="flex items-center space-x-6">
						<span className="hover:text-slate-800 transition-colors">
							{t.landing.footer.privacyPolicy}
						</span>
						<span className="hover:text-slate-800 transition-colors">
							{t.landing.footer.cloudSync}
						</span>
						<span className="text-slate-400 font-mono hover:text-slate-600 transition-colors">
							{t.landing.footer.version}
						</span>
					</div>
				</div>
			</footer>
		</main>
	);
}
