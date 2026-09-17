import { EyeOff, GripVertical, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { messages } from "../lib/i18n";
import { useLocale } from "./locale-provider";

type BentoCardProps = {
  icon: LucideIcon;
  title: ReactNode;
  /** Optional element rendered at the far right of the fixed header. */
  action?: ReactNode;
  /** Grid placement classes (col/row span) supplied by the layout. */
  className?: string;
  /** When true the body scrolls instead of growing the card. */
  scrollBody?: boolean;
  editMode?: boolean;
  onHide?: () => void;
  children: ReactNode;
};

/**
 * Shared card shell: white surface, large rounding, no shadow, and a
 * fixed-height header (icon + title on the left, action on the right).
 * Every tracker renders inside one of these for a fully synced UI.
 */
export function BentoCard({
  icon: Icon,
  title,
  action,
  className,
  scrollBody = true,
  editMode,
  onHide,
  children,
}: BentoCardProps) {
  const locale = useLocale();
  const hideCardLabel = messages[locale].components.bentoCard.hideCard;
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-card transition-colors",
        editMode && "border-2 border-dashed border-amber-400 bg-amber-50/20 dark:bg-amber-950/20",
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-2">
        <div className="flex min-w-0 items-center gap-2">
          {editMode ? (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-amber-600 dark:text-amber-400 cursor-grab drag-handle active:cursor-grabbing hover:bg-amber-100/60 dark:hover:bg-amber-900/40 transition-colors">
              <GripVertical size={16} strokeWidth={2.2} />
            </span>
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-600 dark:text-slate-400">
              <Icon size={16} strokeWidth={2} />
            </span>
          )}
          <div role="heading" aria-level={2} className="truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!editMode && action}
          {editMode && onHide && (
            <button
              type="button"
              aria-label={hideCardLabel}
              title={hideCardLabel}
              onClick={onHide}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded transition-colors"
            >
              <EyeOff size={13} />
              <span>{hideCardLabel}</span>
            </button>
          )}
        </div>
      </header>
      <div
        className={cn(
          "min-h-0 flex-1",
          scrollBody && "overflow-y-auto custom-scrollbar",
        )}
      >
        {children}
      </div>
    </section>
  );
}
