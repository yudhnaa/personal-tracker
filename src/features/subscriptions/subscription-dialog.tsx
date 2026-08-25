import { useState } from "react";
import { FieldLabel, TextField } from "../../components/form-controls";
import { Modal } from "../../components/modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { todayIso } from "../../lib/date";
import { messages } from "../../lib/i18n";
import { useLocale } from "../../components/locale-provider";
import type { BillingCycle, SubscriptionDraft } from "./use-subscriptions";

type SubscriptionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: SubscriptionDraft) => Promise<void>;
};

const EMPTY: SubscriptionDraft = {
  name: "",
  amount: 0,
  billingCycle: "monthly",
  nextRenewalDate: "",
  lastPaymentDate: null,
};

export function SubscriptionDialog({
	...props
}: SubscriptionDialogProps) {
	return <SubscriptionDialogForm key={props.open ? "open" : "closed"} {...props} />;
}

function SubscriptionDialogForm({
  open,
  onClose,
  onSubmit,
}: SubscriptionDialogProps) {
  const [draft, setDraft] = useState<SubscriptionDraft>(() => ({
    ...EMPTY,
    nextRenewalDate: todayIso(),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const t = messages[locale].features.subscriptions.dialog;

  async function submit() {
    if (saving || !draft.name.trim() || !draft.nextRenewalDate || draft.amount < 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...draft,
        name: draft.name.trim(),
        lastPaymentDate: draft.lastPaymentDate || null,
      });
      onClose();
    } catch {
      setError(t.saveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={t.title} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <FieldLabel>{t.name}</FieldLabel>
          <TextField
            autoFocus
            placeholder={t.namePlaceholder}
            value={draft.name}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && void submit()}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>{t.amount}</FieldLabel>
            <TextField
              type="number"
              min="0"
              step="0.01"
              value={draft.amount || ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  amount: Number(e.target.value || 0),
                }))
              }
            />
          </div>
          <div>
            <FieldLabel>{t.billingCycle}</FieldLabel>
            <Select
              value={draft.billingCycle}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  billingCycle: value as BillingCycle,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">{t.monthly}</SelectItem>
                <SelectItem value="yearly">{t.yearly}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel>{t.nextRenewalDate}</FieldLabel>
            <TextField
              type="date"
              value={draft.nextRenewalDate}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, nextRenewalDate: e.target.value }))
              }
            />
          </div>
          <div>
            <FieldLabel>{t.lastPaymentDate}</FieldLabel>
            <TextField
              type="date"
              value={draft.lastPaymentDate ?? ""}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  lastPaymentDate: e.target.value || null,
                }))
              }
            />
          </div>
        </div>

        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="w-full rounded-full bg-btn py-2.5 text-sm font-semibold text-btn-ink transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t.saving : t.save}
        </button>
      </div>
    </Modal>
  );
}
