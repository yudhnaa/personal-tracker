"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
	ShieldCheck,
	Lock,
	EyeOff,
	Calendar,
	Trash2,
	Mail,
	ArrowLeft,
	ExternalLink,
	CheckCircle2,
} from "lucide-react";
import { LanguageSwitcher } from "./language-switcher";
import { messages, type Locale } from "@/lib/i18n";
import { useCurrentAccount } from "@/lib/use-required-account";

export function PolicyPage({ initialLocale }: { initialLocale: Locale }) {
	const [locale, setLocale] = useState<Locale>(initialLocale);
	const account = useCurrentAccount();
	const isLoggedIn = Boolean(account.data);
	const t = messages[locale];

	const isEn = locale === "en";

	return (
		<main className="min-h-screen bg-[#F8F9FA] text-slate-800 antialiased flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
			{/* Top Navigation */}
			<header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
					{/* Brand Logo */}
					<div className="flex items-center space-x-6">
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

						<Link
							href="/"
							className="hidden sm:inline-flex items-center text-xs text-slate-500 hover:text-slate-800 transition-colors"
						>
							<ArrowLeft size={13} className="mr-1" />
							{isEn ? "Back to Home" : "Về trang chủ"}
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
							</Link>
						) : (
							<Link
								href="/login"
								className="text-xs sm:text-[13px] font-medium text-slate-700 hover:text-slate-950 px-2 py-1 transition-colors"
							>
								{t.nav.login}
							</Link>
						)}

						<div className="h-4 w-px bg-slate-200" />
						<LanguageSwitcher locale={locale} onChange={setLocale} />
					</div>
				</div>
			</header>

			{/* Main Content Area */}
			<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 w-full flex-1">
				{/* Header Section */}
				<div className="border-b border-slate-200 pb-8 mb-10">
					<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60 mb-4">
						<ShieldCheck size={14} />
						<span>{isEn ? "Data Protection & Privacy" : "Bảo vệ dữ liệu & Quyền riêng tư"}</span>
					</div>
					<h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-3">
						{isEn ? "Privacy Policy" : "Chính sách Quyền riêng tư"}
					</h1>
					<p className="text-sm text-slate-500">
						<span>{isEn ? "Application: " : "Ứng dụng: "}</span>
						<strong className="text-slate-700 font-semibold">Personal Tracker</strong>
						<span className="mx-2">•</span>
						<span>{isEn ? "URL: " : "Địa chỉ: "}</span>
						<a
							href="https://per-tracker.yudhna.id.vn"
							className="text-emerald-700 hover:underline"
						>
							https://per-tracker.yudhna.id.vn
						</a>
						<span className="mx-2">•</span>
						<span>{isEn ? "Last updated: November 6, 2026" : "Cập nhật lần cuối: Ngày 6 tháng 11 năm 2026"}</span>
					</p>
				</div>

				{/* Quick Highlights Card */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
					<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
						<div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
							<EyeOff size={18} />
						</div>
						<h3 className="font-semibold text-slate-900 text-sm mb-1">
							{isEn ? "No Ads & No Data Selling" : "Không quảng cáo & Không bán dữ liệu"}
						</h3>
						<p className="text-xs text-slate-500 leading-relaxed">
							{isEn
								? "We never sell your data, monetize your information, or serve advertisements."
								: "Chúng tôi không bao giờ bán, thương mại hóa thông tin hoặc phân phát quảng cáo."}
						</p>
					</div>

					<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
						<div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
							<Lock size={18} />
						</div>
						<h3 className="font-semibold text-slate-900 text-sm mb-1">
							{isEn ? "Encrypted Credentials" : "Mã hóa thông tin xác thực"}
						</h3>
						<p className="text-xs text-slate-500 leading-relaxed">
							{isEn
								? "All API tokens and session keys are encrypted with AES-256 and transmitted via HTTPS/TLS."
								: "Mọi mã xác thực và phiên làm việc đều được mã hóa bằng AES-256 và truyền tải qua HTTPS/TLS."}
						</p>
					</div>

					<div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
						<div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
							<Calendar size={18} />
						</div>
						<h3 className="font-semibold text-slate-900 text-sm mb-1">
							{isEn ? "Full User Control" : "Toàn quyền kiểm soát"}
						</h3>
						<p className="text-xs text-slate-500 leading-relaxed">
							{isEn
								? "Disconnect Google Calendar anytime in Settings or revoke access via Google Security."
								: "Ngắt kết nối Google Calendar bất cứ lúc nào trong Cài đặt hoặc qua Google Security."}
						</p>
					</div>
				</div>

				{/* Google Limited Use Compliance Callout - CRITICAL FOR GOOGLE VERIFICATION */}
				<div className="bg-amber-50/70 border-2 border-amber-300/80 rounded-xl p-6 mb-10 shadow-2xs">
					<div className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
							!
						</div>
						<div className="space-y-2 text-sm text-slate-800">
							<h3 className="font-bold text-slate-900 text-base">
								{isEn
									? "Google API Services User Data Policy Compliance"
									: "Tuân thủ Chính sách Dữ liệu Người dùng của Google API Services"}
							</h3>
							<p className="leading-relaxed font-medium text-slate-900">
								{isEn ? (
									<>
										Personal Tracker&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{" "}
										<a
											href="https://developers.google.com/terms/api-services-user-data-policy"
											target="_blank"
											rel="noopener noreferrer"
											className="text-emerald-700 underline font-semibold hover:text-emerald-900 inline-flex items-center gap-0.5"
										>
											Google API Services User Data Policy
											<ExternalLink size={12} className="inline ml-0.5" />
										</a>
										, including the Limited Use requirements.
									</>
								) : (
									<>
										Việc Personal Tracker sử dụng và chuyển giao thông tin nhận được từ Google APIs sang bất kỳ ứng dụng nào khác sẽ tuân thủ{" "}
										<a
											href="https://developers.google.com/terms/api-services-user-data-policy"
											target="_blank"
											rel="noopener noreferrer"
											className="text-emerald-700 underline font-semibold hover:text-emerald-900 inline-flex items-center gap-0.5"
										>
											Chính sách Dữ liệu Người dùng của Google API Services
											<ExternalLink size={12} className="inline ml-0.5" />
										</a>
										, bao gồm các yêu cầu về Giới hạn Sử dụng (Limited Use).
									</>
								)}
							</p>
						</div>
					</div>
				</div>

				{/* Detailed Sections */}
				<div className="space-y-10 text-slate-700 text-sm leading-relaxed">
					{/* Section 1 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "1. About Personal Tracker" : "1. Giới thiệu về Personal Tracker"}
						</h2>
						<p>
							{isEn ? (
								<>
									Personal Tracker (accessible at{" "}
									<a
										href="https://per-tracker.yudhna.id.vn"
										className="text-emerald-700 hover:underline"
									>
										https://per-tracker.yudhna.id.vn
									</a>
									) is a private productivity dashboard designed to help individuals manage everyday tasks, habit tracking, subscriptions, notes, bookmarks, and calendar agenda in an integrated, distraction-free interface.
								</>
							) : (
								<>
									Personal Tracker (tại địa chỉ{" "}
									<a
										href="https://per-tracker.yudhna.id.vn"
										className="text-emerald-700 hover:underline"
									>
										https://per-tracker.yudhna.id.vn
									</a>
									) là nền tảng quản lý năng suất cá nhân, giúp người dùng theo dõi công việc hàng ngày, thói quen, chi tiêu định kỳ, ghi chú, dấu trang và lịch trình trên một giao diện thống nhất.
								</>
							)}
						</p>
					</section>

					{/* Section 2 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "2. Information We Collect" : "2. Thông tin chúng tôi thu thập"}
						</h2>
						<p>
							{isEn
								? "We collect information solely to provide, personalize, and improve your personal tracking experience:"
								: "Chúng tôi chỉ thu thập thông tin cần thiết để cung cấp và nâng cao trải nghiệm quản lý cá nhân của bạn:"}
						</p>

						<div className="space-y-3 pl-2">
							<div className="border-l-2 border-emerald-500 pl-3">
								<h4 className="font-semibold text-slate-900">
									{isEn ? "A. Account Information" : "A. Thông tin tài khoản"}
								</h4>
								<p className="text-slate-600 text-xs sm:text-sm mt-0.5">
									{isEn
										? "When you register, we collect your email address and encrypted password to authenticate your account and ensure secure access."
										: "Khi bạn tạo tài khoản, chúng tôi lưu địa chỉ email và mật khẩu được mã hóa an toàn để xác thực quyền truy cập của bạn."}
								</p>
							</div>

							<div className="border-l-2 border-emerald-500 pl-3">
								<h4 className="font-semibold text-slate-900">
									{isEn ? "B. Workspace Content" : "B. Dữ liệu bảng điều khiển"}
								</h4>
								<p className="text-slate-600 text-xs sm:text-sm mt-0.5">
									{isEn
										? "Tasks, checklist items, habits, notes, bookmarks, subscriptions, and layout preferences that you voluntarily create within your personal dashboard."
										: "Công việc cần làm, danh sách kiểm tra, nhật ký thói quen, ghi chú, dấu trang liên kết và các tùy chọn bố cục giao diện do bạn nhập."}
								</p>
							</div>

							<div className="border-l-2 border-emerald-500 pl-3">
								<h4 className="font-semibold text-slate-900">
									{isEn ? "C. Google User Data (Optional Integration)" : "C. Dữ liệu người dùng Google (Tính năng mở rộng)"}
								</h4>
								<p className="text-slate-600 text-xs sm:text-sm mt-0.5">
									{isEn
										? "When you voluntarily connect your Google Account to synchronize Google Calendar with Personal Tracker, we request access to the following scopes:"
										: "Khi bạn chủ động kết nối tài khoản Google để đồng bộ Google Calendar với Personal Tracker, hệ thống sẽ yêu cầu quyền hạn sau:"}
								</p>
								<ul className="list-disc pl-5 mt-2 space-y-1.5 text-xs sm:text-sm text-slate-600">
									<li>
										<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">openid</code> &amp;{" "}
										<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">email</code>:{" "}
										{isEn
											? "Used to identify your Google Account and display the connected account email address in your settings panel."
											: "Dùng để xác định tài khoản Google và hiển thị địa chỉ email đã kết nối trong bảng điều khiển Cài đặt."}
									</li>
									<li>
										<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
											https://www.googleapis.com/auth/calendar.calendarlist.readonly
										</code>
										:{" "}
										{isEn
											? "Used to retrieve the list and names of your calendars, allowing you to select which calendar to view or sync within Personal Tracker."
											: "Dùng để hiển thị danh sách các lịch của bạn, giúp bạn chọn lịch cần xem hoặc đồng bộ."}
									</li>
									<li>
										<code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">
											https://www.googleapis.com/auth/calendar.events
										</code>
										:{" "}
										{isEn
											? "Used to view upcoming events in your agenda/calendar views, convert calendar events into tasks, and allow you to create or update events directly from the dashboard."
											: "Dùng để hiển thị sự kiện trên lịch biểu/agenda, chuyển đổi sự kiện thành công việc, và tạo hoặc chỉnh sửa sự kiện trực tiếp từ ứng dụng."}
									</li>
								</ul>
							</div>
						</div>
					</section>

					{/* Section 3 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "3. How We Use Your Data" : "3. Mục đích sử dụng dữ liệu"}
						</h2>
						<p>
							{isEn
								? "We use data strictly to provide user-facing features within the Personal Tracker dashboard:"
								: "Chúng tôi chỉ sử dụng dữ liệu cho mục đích cung cấp các tính năng quản lý cá nhân trực tiếp cho người dùng:"}
						</p>
						<ul className="space-y-2 pl-2">
							<li className="flex items-start gap-2">
								<CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
								<span>
									{isEn
										? "Displaying your synchronized daily events, deadlines, and schedule on the calendar widget and Wallpaper Agenda."
										: "Hiển thị lịch trình hàng ngày, sự kiện và thời hạn trên tiện ích Lịch và Wallpaper Agenda."}
								</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
								<span>
									{isEn
										? "Enabling two-way interaction: updating task events or creating new calendar items based on your direct user actions."
										: "Cho phép tương tác hai chiều: tạo hoặc cập nhật lịch trình tương ứng với hành động trực tiếp của bạn."}
								</span>
							</li>
							<li className="flex items-start gap-2">
								<CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
								<span>
									{isEn
										? "Saving your dashboard customizations, active theme, language preferences, and habits progress."
										: "Lưu trữ bố cục, tùy chọn ngôn ngữ, cài đặt hiển thị và tiến độ thói quen của bạn."}
								</span>
							</li>
						</ul>
					</section>

					{/* Section 4 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn
								? "4. Limited Use & Data Sharing Policy (Google APIs)"
								: "4. Quy định về Giới hạn Sử dụng & Chia sẻ Dữ liệu Google"}
						</h2>
						<p>
							{isEn ? (
								<>
									Personal Tracker adheres strictly to the{" "}
									<a
										href="https://developers.google.com/terms/api-services-user-data-policy"
										target="_blank"
										rel="noopener noreferrer"
										className="text-emerald-700 underline font-medium hover:text-emerald-900"
									>
										Google API Services User Data Policy
									</a>
									. In compliance with the Limited Use requirements:
								</>
							) : (
								<>
									Personal Tracker tuân thủ nghiêm ngặt{" "}
									<a
										href="https://developers.google.com/terms/api-services-user-data-policy"
										target="_blank"
										rel="noopener noreferrer"
										className="text-emerald-700 underline font-medium hover:text-emerald-900"
									>
										Chính sách Dữ liệu Người dùng Google API Services
									</a>
									. Theo các quy định về Giới hạn Sử dụng:
								</>
							)}
						</p>

						<div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
							<div className="flex items-start gap-2.5">
								<div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
									✕
								</div>
								<div>
									<h4 className="font-semibold text-slate-900 text-sm">
										{isEn ? "No Sale of User Data" : "Không bán dữ liệu người dùng"}
									</h4>
									<p className="text-xs text-slate-500 mt-0.5">
										{isEn
											? "We never sell, rent, license, or monetize your personal data or Google user data to any third party, data broker, or marketer."
											: "Chúng tôi không bao giờ bán, cho thuê hoặc chuyển nhượng dữ liệu cá nhân hay dữ liệu Google của bạn cho bất kỳ bên thứ ba nào."}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-2.5">
								<div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
									✕
								</div>
								<div>
									<h4 className="font-semibold text-slate-900 text-sm">
										{isEn ? "No Advertising Use" : "Không dùng cho quảng cáo"}
									</h4>
									<p className="text-xs text-slate-500 mt-0.5">
										{isEn
											? "We do not use Google user data to serve advertisements, personalized marketing, or retargeted promotions."
											: "Dữ liệu người dùng Google tuyệt đối không được sử dụng để phân phối quảng cáo hoặc tiếp thị hành vi."}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-2.5">
								<div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
									✕
								</div>
								<div>
									<h4 className="font-semibold text-slate-900 text-sm">
										{isEn ? "No AI/Machine Learning Model Training" : "Không huấn luyện mô hình Trí tuệ Nhân tạo (AI/ML)"}
									</h4>
									<p className="text-xs text-slate-500 mt-0.5">
										{isEn
											? "We do not use Google user data to train, retrain, or improve generalized machine learning or artificial intelligence models."
											: "Dữ liệu Google của bạn không bao giờ được dùng để huấn luyện hoặc tinh chỉnh các mô hình học máy hay trí tuệ nhân tạo."}
									</p>
								</div>
							</div>

							<div className="flex items-start gap-2.5">
								<div className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
									✕
								</div>
								<div>
									<h4 className="font-semibold text-slate-900 text-sm">
										{isEn ? "No Human Access Without Consent" : "Không cho phép con người đọc dữ liệu mà không có sự đồng ý"}
									</h4>
									<p className="text-xs text-slate-500 mt-0.5">
										{isEn
											? "No humans are permitted to read your Google Calendar data unless: (1) you provide affirmative consent for specific support debugging; (2) it is necessary for security investigations; (3) required by applicable law; or (4) data is aggregated and anonymized."
											: "Nhân viên kỹ thuật không được phép đọc dữ liệu lịch của bạn trừ khi: (1) có sự đồng ý rõ ràng từ bạn khi hỗ trợ kỹ thuật; (2) cần thiết vì lý do bảo mật; (3) theo yêu cầu pháp luật; hoặc (4) dữ liệu đã được ẩn danh tổng hợp."}
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Section 5 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "5. Data Storage, Security & Encryption" : "5. Lưu trữ, Bảo mật & Mã hóa"}
						</h2>
						<p>
							{isEn
								? "We implement industry-standard administrative, physical, and technical safeguards to keep your information secure:"
								: "Chúng tôi áp dụng các tiêu chuẩn an ninh thông tin nghiêm ngặt:"}
						</p>
						<ul className="list-disc pl-5 space-y-1.5 text-slate-600">
							<li>
								<strong>{isEn ? "Encryption in Transit: " : "Mã hóa khi truyền tải: "}</strong>
								{isEn
									? "All web traffic between your browser, our servers, and Google APIs is protected via HTTPS (TLS 1.2/1.3)."
									: "Mọi lưu lượng mạng giữa trình duyệt, máy chủ và Google APIs đều được mã hóa qua giao thức HTTPS (TLS 1.2/1.3)."}
							</li>
							<li>
								<strong>{isEn ? "Encryption at Rest: " : "Mã hóa khi lưu trữ: "}</strong>
								{isEn
									? "Google OAuth refresh tokens and sensitive credentials are encrypted using AES cipher before being stored in our database."
									: "Mã làm mới (refresh tokens) OAuth của Google được mã hóa bằng thuật toán AES trước khi lưu vào cơ sở dữ liệu."}
							</li>
							<li>
								<strong>{isEn ? "Isolated Data Access: " : "Phân quyền cách ly: "}</strong>
								{isEn
									? "Strict database access controls ensure that each user can only read and manage their own connected records."
									: "Kiểm soát truy cập phân tầng đảm bảo mỗi người dùng chỉ truy cập được dữ liệu thuộc quyền sở hữu của chính mình."}
							</li>
						</ul>
					</section>

					{/* Section 6 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn
								? "6. User Control, Disconnection & Data Deletion"
								: "6. Quyền kiểm soát, Hủy kết nối & Xóa dữ liệu"}
						</h2>
						<p>
							{isEn
								? "You maintain complete control over your data and connected Google integrations at all times:"
								: "Bạn luôn có toàn quyền kiểm soát dữ liệu và các kết nối dịch vụ Google:"}
						</p>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
							<div className="bg-white border border-slate-200 rounded-xl p-4">
								<div className="flex items-center gap-2 font-semibold text-slate-900 mb-1 text-sm">
									<Trash2 size={16} className="text-emerald-700" />
									<span>{isEn ? "Disconnect Google Calendar" : "Hủy kết nối Google Calendar"}</span>
								</div>
								<p className="text-xs text-slate-500 leading-relaxed">
									{isEn
										? "You can disconnect your Google account anytime via Settings > Google Calendar in the app. Disconnecting immediately revokes and removes stored tokens and purges cached calendar events."
										: "Bạn có thể ngắt kết nối bất cứ lúc nào tại Cài đặt > Google Calendar. Hệ thống sẽ lập tức xóa mã xác thực và bộ nhớ đệm sự kiện lịch."}
								</p>
							</div>

							<div className="bg-white border border-slate-200 rounded-xl p-4">
								<div className="flex items-center gap-2 font-semibold text-slate-900 mb-1 text-sm">
									<ExternalLink size={16} className="text-emerald-700" />
									<span>{isEn ? "Revoke Google Permissions" : "Thu hồi quyền qua Google"}</span>
								</div>
								<p className="text-xs text-slate-500 leading-relaxed">
									{isEn ? (
										<>
											You can also revoke Personal Tracker&apos;s access directly from your{" "}
											<a
												href="https://myaccount.google.com/permissions"
												target="_blank"
												rel="noopener noreferrer"
												className="text-emerald-700 underline font-medium hover:text-emerald-900"
											>
												Google Account Permissions Page
											</a>
											.
										</>
									) : (
										<>
											Bạn có thể thu hồi quyền truy cập của Personal Tracker bất cứ lúc nào tại{" "}
											<a
												href="https://myaccount.google.com/permissions"
												target="_blank"
												rel="noopener noreferrer"
												className="text-emerald-700 underline font-medium hover:text-emerald-900"
											>
												Trang quản lý quyền tài khoản Google
											</a>
											.
										</>
									)}
								</p>
							</div>
						</div>

						<p className="mt-3">
							{isEn
								? "To request complete deletion of your account, email us at the contact address below. All personal data associated with your account will be permanently erased."
								: "Để yêu cầu xóa hoàn toàn tài khoản và toàn bộ dữ liệu cá nhân, vui lòng liên hệ với chúng tôi qua email bên dưới. Dữ liệu sẽ được xóa vĩnh viễn khỏi hệ thống."}
						</p>
					</section>

					{/* Section 7 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "7. Children's Privacy" : "7. Quyền riêng tư của trẻ em"}
						</h2>
						<p>
							{isEn
								? "Personal Tracker is not directed to individuals under the age of 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us for immediate deletion."
								: "Personal Tracker không dành cho trẻ em dưới 13 tuổi. Chúng tôi không cố ý thu thập thông tin của trẻ em. Nếu bạn phát hiện trẻ em cung cấp thông tin, vui lòng thông báo để chúng tôi xóa ngay lập tức."}
						</p>
					</section>

					{/* Section 8 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "8. Changes to This Privacy Policy" : "8. Cập nhật chính sách"}
						</h2>
						<p>
							{isEn
								? "We may update this Privacy Policy from time to time to reflect changes in functionality or legal requirements. Any modifications will be posted directly on this page with an updated 'Last updated' date."
								: "Chúng tôi có thể cập nhật chính sách này theo thời gian để phù hợp với các cải tiến tính năng hoặc yêu cầu pháp lý. Mọi thay đổi sẽ được công bố trực tiếp tại trang này cùng ngày cập nhật tương ứng."}
						</p>
					</section>

					{/* Section 9 */}
					<section className="space-y-3">
						<h2 className="text-xl font-bold text-slate-900 tracking-tight">
							{isEn ? "9. Contact Information" : "9. Thông tin liên hệ"}
						</h2>
						<p>
							{isEn
								? "If you have questions, feedback, or requests regarding this Privacy Policy or your personal data, please contact:"
								: "Nếu bạn có bất kỳ câu hỏi hoặc yêu cầu nào liên quan đến Chính sách Quyền riêng tư, vui lòng liên hệ:"}
						</p>
						<div className="bg-white border border-slate-200 rounded-xl p-5 flex items-center gap-3">
							<div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
								<Mail size={20} />
							</div>
							<div>
								<div className="font-semibold text-slate-900">Personal Tracker Privacy Team</div>
								<a
									href="mailto:contact@yudhna.id.vn"
									className="text-xs sm:text-sm text-emerald-700 hover:underline font-mono"
								>
									contact@yudhna.id.vn
								</a>
								<div className="text-xs text-slate-500 mt-0.5">
									Website:{" "}
									<a
										href="https://per-tracker.yudhna.id.vn"
										className="hover:underline text-slate-700"
									>
										https://per-tracker.yudhna.id.vn
									</a>
								</div>
							</div>
						</div>
					</section>
				</div>
			</div>

			{/* Site Footer */}
			<footer className="border-t border-slate-200 bg-white">
				<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
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

					<div className="flex items-center space-x-6">
						<Link href="/" className="hover:text-slate-800 transition-colors">
							{isEn ? "Home" : "Trang chủ"}
						</Link>
						<Link href="/policy" className="font-semibold text-slate-900 underline underline-offset-4">
							{t.landing.footer.privacyPolicy}
						</Link>
						<span className="text-slate-400 font-mono">
							{t.landing.footer.version}
						</span>
					</div>
				</div>
			</footer>
		</main>
	);
}
