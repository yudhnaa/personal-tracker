"use client";

import { Modal } from "@/components/modal";
import { messages, type Locale } from "@/lib/i18n";
import { WallpaperSettingsPanel } from "./wallpaper-settings-panel";

type WallpaperAgendaModalProps = {
	open: boolean;
	locale: Locale;
	onClose: () => void;
};

export function WallpaperAgendaModal({
	open,
	locale,
	onClose,
}: WallpaperAgendaModalProps) {
	const t = messages[locale].components.settings.wallpaper;

	return (
		<Modal
			open={open}
			title={t.title}
			onClose={onClose}
			wide
		>
			<WallpaperSettingsPanel locale={locale} />
		</Modal>
	);
}
