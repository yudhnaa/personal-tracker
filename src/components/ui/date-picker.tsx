import { format } from "date-fns";
import { enUS, vi } from "date-fns/locale";
import { CalendarClock, X } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/cn";
import { toIsoDate } from "../../lib/date";
import { Calendar } from "./calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip } from "./tooltip";
import { messages } from "@/lib/i18n";
import { useLocale } from "../locale-provider";

type DatePickerProps = {
	/** ISO yyyy-mm-dd, or "" for no date. */
	value: string;
	onChange: (iso: string) => void;
	placeholder?: string;
	/** Show a "clear" action when a date is set. */
	clearable?: boolean;
};

export function DatePicker({
	value,
	onChange,
	placeholder,
	clearable = true,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const selected = value ? new Date(value + "T00:00:00") : undefined;
	const locale = useLocale();
	const t = messages[locale].components.datePicker;
	const resolvedPlaceholder = placeholder ?? t.placeholder;
	const dateLocale = locale === "vi" ? vi : enUS;

	return (
		<Popover
			open={open}
			onOpenChange={setOpen}
		>
			{/* One field block: the trigger fills it, the clear "X" tucks in at the end. */}
			<div
				className={cn(
					"flex items-center rounded-[var(--radius-inner)] bg-surface-muted transition-colors",
					"focus-within:bg-surface-sunken focus-within:ring-2 focus-within:ring-accent/40",
					open && "bg-surface-sunken ring-2 ring-accent/40",
				)}
			>
				<PopoverTrigger asChild>
					<button
						type="button"
						className={cn(
							"flex min-w-0 flex-1 items-center gap-2 px-3.5 py-2.5 text-sm outline-none",
							value ? "text-ink" : "text-ink-faint",
						)}
					>
						<CalendarClock
							size={15}
							className="shrink-0 text-ink-faint"
						/>
						<span className="flex-1 truncate text-left">
							{selected
								? format(selected, "dd/MM/yyyy", { locale: dateLocale })
								: resolvedPlaceholder}
						</span>
					</button>
				</PopoverTrigger>
				{clearable && value ? (
					<Tooltip label={t.clear}>
						<button
							type="button"
							aria-label={t.clear}
							onClick={() => onChange("")}
							className="grid shrink-0 self-stretch place-items-center px-2.5 text-ink-faint transition-colors hover:text-ink"
						>
							<X size={14} />
						</button>
					</Tooltip>
				) : null}
			</div>
			<PopoverContent>
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={selected}
					onSelect={(d) => {
						onChange(d ? toIsoDate(d) : "");
						setOpen(false);
					}}
				/>
			</PopoverContent>
		</Popover>
	);
}
