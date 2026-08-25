import { messages, type Locale } from "@/lib/i18n";
import { Modal } from "./modal";

type WelcomeModalProps = {
	open: boolean;
	onClose: () => void;
	locale: Locale;
};

/** First-visit introduction for a newly provisioned account. */
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
