import { Settings } from "lucide-react";
import { messages, type Locale } from "@/lib/i18n";
import { Modal } from "./modal";

type WelcomeModalProps = {
	open: boolean;
	onClose: () => void;
	locale: Locale;
};

/** First-visit intro: explains the board and that the data is just a sample. */
export function WelcomeModal({ open, onClose, locale }: WelcomeModalProps) {
	const t = messages[locale].components.welcome;

	return (
		<Modal
			open={open}
			title={t.title}
			onClose={onClose}
		>
			<div className="space-y-5">
				<p className="text-sm leading-relaxed text-ink-soft">{t.intro}</p>

				<p className="rounded-[var(--radius-inner)] bg-surface-sunken p-3.5 text-sm leading-relaxed text-ink-soft">
					{t.sampleData} {t.sampleAction}{" "}
					<span className="inline-flex items-center gap-1 font-medium text-ink">
						<Settings size={13} /> {t.settingsLabel}
					</span>{" "}
					→ <strong className="text-ink">{t.deleteDataLabel}</strong>.
				</p>

				<button
					type="button"
					onClick={onClose}
					className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90"
				>
					{t.start}
				</button>
			</div>
		</Modal>
	);
}
