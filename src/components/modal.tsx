import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "../lib/cn";
import { IconButton } from "./icon-button";
import { messages } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

type ModalProps = {
	open: boolean;
	/** A string renders as a heading; a node (e.g. status pills) renders as-is. */
	title: ReactNode;
	onClose: () => void;
	children: ReactNode;
	/** Optional control rendered in the header, left of the close button. */
	headerAction?: ReactNode;
	/** Wider dialog for multi-column content (e.g. the task detail). */
	wide?: boolean;
};

const FOCUSABLE =
	'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';
const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;
let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = "";

/**
 * Centered dialog with animated enter/exit. Closes on Escape / backdrop, traps
 * Tab focus inside, locks background scroll, and restores focus to the trigger
 * on close so keyboard users never get stranded behind the overlay.
 */
export function Modal({
	open,
	title,
	onClose,
	children,
	headerAction,
	wide,
}: ModalProps) {
	const dialogRef = useRef<HTMLDivElement>(null);
	const mounted = useSyncExternalStore(
		subscribeToHydration,
		getClientHydrationSnapshot,
		getServerHydrationSnapshot,
	);
	const locale = useLocale();
	const t = messages[locale].components.modal;
	const reduceMotion = useReducedMotion();

	// Escape closes; Tab cycles within the dialog (skips Radix portals).
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (!isTopmostDialog(dialogRef.current)) return;
			if (e.key === "Escape") {
				// A Radix dropdown (select/date popover) is open — let it consume Esc
				// first; one keypress shouldn't dismiss the whole dialog too.
				if (document.querySelector("[data-radix-popper-content-wrapper]"))
					return;
				onClose();
			} else if (e.key === "Tab") trapTab(e, dialogRef.current);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	// Lock background scroll, pull focus into the dialog, restore it on close.
	useEffect(() => {
		if (!open) return;
		const active = document.activeElement as HTMLElement | null;
		// If a field already took focus (autoFocus), leave it — and don't treat
		// that field as the trigger to restore to.
		const focusedInside = !!dialogRef.current?.contains(active);
		const trigger = focusedInside ? null : active;
		const releaseBodyScroll = lockBodyScroll();
		const id = window.setTimeout(() => {
			const dialog = dialogRef.current;
			if (!dialog || dialog.contains(document.activeElement)) return;
			dialog.focus();
		}, 0);
		return () => {
			window.clearTimeout(id);
			releaseBodyScroll();
			trigger?.focus?.();
		};
	}, [open]);

	// Portal to <body> so the fixed overlay always covers the full viewport.
	// The dashboard shell uses backdrop-filter, which makes it a containing
	// block for position:fixed — rendering inline would clip the overlay to it.
	if (!mounted) return null;

	return createPortal(
		<AnimatePresence>
			{open ? (
				<motion.div
					className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
					onMouseDown={onClose}
					initial={reduceMotion ? false : { opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: reduceMotion ? 0 : 0.18 }}
				>
					<motion.div
						ref={dialogRef}
						role="dialog"
						aria-modal="true"
						aria-label={typeof title === "string" ? title : t.fallbackTitle}
						tabIndex={-1}
						className={cn(
							"max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[var(--radius-card)] bg-surface p-6 outline-none",
							wide ? "max-w-3xl" : "max-w-xl",
						)}
						onMouseDown={(e) => e.stopPropagation()}
						initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 10 }}
						transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
					>
						<div className="mb-5 flex items-center justify-between gap-3">
							{typeof title === "string" ? (
								<h3 className="text-lg font-semibold tracking-tight text-ink">
									{title}
								</h3>
							) : (
								<div className="min-w-0 flex-1">{title}</div>
							)}
							<div className="flex shrink-0 items-center gap-1.5">
								{headerAction}
								<IconButton
									aria-label={t.close}
									title={t.close}
									onClick={onClose}
								>
									<X size={18} />
								</IconButton>
							</div>
						</div>
						{children}
					</motion.div>
				</motion.div>
			) : null}
		</AnimatePresence>,
		document.body,
	);
}

function isTopmostDialog(dialog: HTMLElement | null): boolean {
	if (!dialog) return false;
	const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
	return dialogs.length > 0 && dialogs[dialogs.length - 1] === dialog;
}

function lockBodyScroll(): () => void {
	if (bodyScrollLockCount === 0) {
		bodyOverflowBeforeLock = document.body.style.overflow;
	}
	bodyScrollLockCount += 1;
	document.body.style.overflow = "hidden";
	let released = false;
	return () => {
		if (released) return;
		released = true;
		bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
		if (bodyScrollLockCount === 0) {
			document.body.style.overflow = bodyOverflowBeforeLock;
		}
	};
}

/**
 * Keep Tab focus inside the dialog. Stays out of the way when focus is in a
 * portaled layer (Radix select/popover render outside the dialog DOM).
 */
function trapTab(e: KeyboardEvent, container: HTMLElement | null) {
	if (!container) return;
	const active = document.activeElement as HTMLElement | null;
	if (active && !container.contains(active)) return;

	const nodes = Array.from(
		container.querySelectorAll<HTMLElement>(FOCUSABLE),
	).filter((el) => el.offsetParent !== null);
	if (nodes.length === 0) return;

	const first = nodes[0];
	const last = nodes[nodes.length - 1];
	if (e.shiftKey && active === first) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && active === last) {
		e.preventDefault();
		first.focus();
	}
}
