import "react-day-picker/style.css";
import { enUS, vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "../../lib/cn";
import { useLocale } from "../locale-provider";

/** Month calendar themed to the app's tokens (see `.rdp-themed` in index.css). */
export function Calendar({ className, ...props }: DayPickerProps) {
	const locale = useLocale();
	return (
		<DayPicker
			locale={locale === "vi" ? vi : enUS}
			showOutsideDays
			className={cn("rdp-themed", className)}
			components={{
				Chevron: ({ orientation, ...p }) =>
					orientation === "left" ? (
						<ChevronLeft
							size={16}
							{...p}
						/>
					) : (
						<ChevronRight
							size={16}
							{...p}
						/>
					),
			}}
			{...props}
		/>
	);
}
