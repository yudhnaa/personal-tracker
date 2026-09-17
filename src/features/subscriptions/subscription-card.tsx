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
  normal: "text-slate-500",
  due_soon: "text-amber-700 font-medium",
  overdue: "text-red-700 font-medium",
};

const STATUS_CHIP_CLASSES: Record<SubscriptionStatus, string> = {
  normal: "bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-[4px]",
  due_soon: "bg-amber-50 text-amber-700 border border-amber-200 rounded-[4px]",
  overdue: "bg-red-50 text-red-700 border border-red-200 rounded-[4px]",
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

  // Calculate monthly total
  const monthlyTotal = subscriptions.reduce((sum, sub) => {
    let monthlyAmount = sub.amount;
    if (sub.billingCycle === "yearly") monthlyAmount = sub.amount / 12;
    return sum + monthlyAmount;
  }, 0);

  const formattedTotal = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monthlyTotal);

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
      title={
        <div className="flex items-center gap-2">
          <span>{t.title}</span>
          <span className="font-mono text-[11px] font-normal text-slate-500 tabular-nums">
            {formattedTotal}₫/mo
          </span>
        </div>
      }
      scrollBody={false}
      className={className}
      editMode={editMode}
      onHide={onHide}
      action={
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex h-7 items-center gap-1.5 rounded-md bg-[#15803D] px-2.5 text-xs font-medium text-white transition-colors hover:bg-[#166534] shadow-sm"
        >
          <Plus size={14} />
          {t.addSubscription}
        </button>
      }
    >
      <div className="flex h-full flex-col">
        {error ? (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200">
            {error}
          </p>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col divide-y divide-slate-100 overflow-y-auto">
          {subscriptions.length === 0 ? (
            <p className="grid flex-1 place-items-center text-center text-xs text-slate-400 whitespace-pre-line py-8">
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
    <div className="group relative flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-slate-50/70 rounded-md">
      <Tooltip label={t.confirmPayment}>
        <button
          type="button"
          onClick={onConfirm}
          disabled={confirming}
          aria-label={t.confirmPayment}
          className={cn(
            "grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors",
            confirming
              ? "border-[#15803D]/40 bg-emerald-50 text-[#15803D]"
              : "border-slate-300 text-transparent hover:border-slate-400 hover:text-slate-400",
          )}
        >
          {confirming ? (
            <Loader2 size={11} className="animate-spin text-[#15803D]" />
          ) : (
            <Check size={11} strokeWidth={3} />
          )}
        </button>
      </Tooltip>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <p className="min-w-0 truncate text-xs font-medium text-slate-800">
            {subscription.name}
          </p>
          <span
            className={cn(
              "shrink-0 px-1.5 py-0.5 text-[10px] font-medium leading-none",
              STATUS_CHIP_CLASSES[subscription.status],
            )}
          >
            {t.status[subscription.status]}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
          <span className={STATUS_CLASSES[subscription.status]}>
            {t.renewsOn(formatDate(subscription.nextRenewalDate, locale))}
          </span>
          {subscription.lastPaymentDate ? (
            <span>• {t.lastPaid(formatDate(subscription.lastPaymentDate, locale))}</span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 text-right">
        <div>
          <span className="font-mono text-xs font-semibold tabular-nums text-slate-800">
            {amount}₫
          </span>
          <p className="text-[10px] text-slate-400 leading-none">
            {t.cycle[subscription.billingCycle]}
          </p>
        </div>

        <Tooltip label={t.deleteTooltip}>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.deleteTooltip}
            className="grid h-6 w-6 shrink-0 place-items-center rounded text-slate-400 opacity-0 transition hover:bg-slate-200 hover:text-slate-700 group-hover:opacity-100"
          >
            <X size={13} />
          </button>
        </Tooltip>
      </div>
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
