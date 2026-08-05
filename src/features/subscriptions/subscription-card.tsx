import { Check, CreditCard, Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { BentoCard } from "../../components/bento-card";
import { Tooltip } from "../../components/ui/tooltip";
import { cn } from "../../lib/cn";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import { SubscriptionDialog } from "./subscription-dialog";
import {
  useSubscriptions,
  type Subscription,
  type SubscriptionDraft,
  type SubscriptionStatus,
} from "./use-subscriptions";

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  normal: "text-emerald-600 dark:text-emerald-400",
  due_soon: "text-amber-600 dark:text-amber-400",
  overdue: "text-red-600 dark:text-red-400",
};

const STATUS_CHIP_CLASSES: Record<SubscriptionStatus, string> = {
  normal: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  due_soon: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-300",
};

export function SubscriptionCard({
  className,
  editMode,
  onHide,
}: {
  className?: string;
  editMode?: boolean;
  onHide?: () => void;
}) {
  const { subscriptions, addSubscription, removeSubscription, confirmPayment } =
    useSubscriptions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const t = messages[locale].features.subscriptions;

  async function handleAdd(draft: SubscriptionDraft) {
    await addSubscription(draft);
  }

  async function handleConfirm(id: string) {
    setConfirmingId(id);
    setError(null);
    try {
      await confirmPayment(id);
    } catch {
      setError(t.confirmError);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <BentoCard
      icon={CreditCard}
      title={t.title}
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-full bg-btn pl-3 pr-3.5 text-[13px] font-semibold text-btn-ink transition-colors hover:opacity-90"
        >
          <Plus size={16} />
          {t.addSubscription}
        </button>
      }
    >
      <div className="flex h-full flex-col">
        {error ? (
          <p className="mb-3 rounded-[var(--radius-inner)] bg-red-500/10 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
          {subscriptions.length === 0 ? (
            <p className="grid flex-1 place-items-center text-center text-sm text-ink-faint whitespace-pre-line">
              {t.empty}
            </p>
          ) : (
            subscriptions.map((subscription) => (
              <SubscriptionRow
                key={subscription.id}
                subscription={subscription}
                confirming={confirmingId === subscription.id}
                onConfirm={() => handleConfirm(subscription.id)}
                onRemove={() => removeSubscription(subscription.id).catch(() => setError(t.deleteError))}
              />
            ))
          )}
        </div>
      </div>

      <SubscriptionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleAdd}
      />
    </BentoCard>
  );
}

function SubscriptionRow({
  subscription,
  confirming,
  onConfirm,
  onRemove,
}: {
  subscription: Subscription;
  confirming: boolean;
  onConfirm: () => void;
  onRemove: () => void;
}) {
  const locale = useLocale();
  const t = messages[locale].features.subscriptions;
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(subscription.amount);

  return (
    <div className="group relative flex items-center gap-3 rounded-[var(--radius-inner)] bg-surface-sunken px-3 py-2">
      <Tooltip label={t.confirmPayment}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          aria-label={t.confirmPayment}
          className={cn(
            "grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors",
            confirming
              ? "border-accent/40 bg-accent/10 text-accent"
              : "border-line text-transparent hover:border-ink-faint hover:text-ink-soft",
          )}
        >
          {confirming ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} strokeWidth={3} />
          )}
        </button>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-sm font-medium text-ink">
            {subscription.name}
          </p>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              STATUS_CHIP_CLASSES[subscription.status],
            )}
          >
            {t.status[subscription.status]}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          <span className={cn("font-semibold", STATUS_CLASSES[subscription.status])}>
            {t.renewsOn(formatDate(subscription.nextRenewalDate, locale))}
          </span>
          <span>{t.amount(amount)}</span>
          <span>{t.cycle[subscription.billingCycle]}</span>
          {subscription.lastPaymentDate ? (
            <span>{t.lastPaid(formatDate(subscription.lastPaymentDate, locale))}</span>
          ) : null}
        </div>
      </div>

      <Tooltip label={t.deleteTooltip}>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.deleteTooltip}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink-faint opacity-0 transition hover:bg-surface-hover hover:text-ink group-hover:opacity-100"
        >
          <X size={15} />
        </button>
      </Tooltip>
    </div>
  );
}

function formatDate(iso: string, locale: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}
