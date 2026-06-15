import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { cn } from "../lib/cn";
import { Modal } from "./modal";
import { messages } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

type ConfirmOptions = {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Imperative confirm: `if (await confirm({...})) doThing()`. */
export function useConfirm(): ConfirmFn {
	const ctx = useContext(ConfirmContext);
	if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
	return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const locale = useLocale();
	const [state, setState] = useState<{
		open: boolean;
		options: ConfirmOptions;
	}>({ open: false, options: { title: "" } });
	const resolver = useRef<(v: boolean) => void>(() => {});
	const t = messages[locale].components.confirm;

	const confirm = useCallback<ConfirmFn>((options) => {
		setState({ open: true, options });
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
		});
	}, []);

	function settle(result: boolean) {
		resolver.current(result);
		setState((s) => ({ ...s, open: false }));
	}

	const { open, options } = state;

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			<Modal
				open={open}
				title={options.title}
				onClose={() => settle(false)}
			>
				<div className="space-y-5">
					{options.message ? (
						<p className="text-sm leading-relaxed text-ink-soft">
							{options.message}
						</p>
					) : null}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => settle(false)}
							className="flex-1 rounded-full bg-surface-muted py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-surface-hover"
						>
							{options.cancelLabel ?? t.cancel}
						</button>
						<button
							type="button"
							onClick={() => settle(true)}
							className={cn(
								"flex-1 rounded-full py-2.5 text-sm font-semibold transition-colors",
								options.danger
									? "bg-red-500 text-white hover:bg-red-600"
									: "bg-btn text-btn-ink hover:opacity-90",
							)}
						>
							{options.confirmLabel ?? t.confirm}
						</button>
					</div>
				</div>
			</Modal>
		</ConfirmContext.Provider>
	);
}
