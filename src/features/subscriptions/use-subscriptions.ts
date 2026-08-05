import { apiJson } from "../../lib/api-client";
import {
  sortSubscriptions,
  type BillingCycle,
  type Subscription,
  type SubscriptionStatus,
} from "../../lib/subscription-utils";
import { useApiState } from "../../lib/use-api-state";

export type { BillingCycle, Subscription, SubscriptionStatus };

export type SubscriptionDraft = {
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  lastPaymentDate?: string | null;
};

export function useSubscriptions() {
  const { data: subscriptions, setData, reload } = useApiState<Subscription[]>(
    "/api/subscriptions",
    [],
  );

  async function addSubscription(draft: SubscriptionDraft) {
    const next = await apiJson<Subscription[]>("/api/subscriptions", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    setData(sortSubscriptions(next));
  }

  async function removeSubscription(id: string) {
    setData((prev) => prev.filter((item) => item.id !== id));
    try {
      const next = await apiJson<Subscription[]>(`/api/subscriptions/${id}`, {
        method: "DELETE",
      });
      setData(sortSubscriptions(next));
    } catch (error) {
      await reload();
      throw error;
    }
  }

  async function confirmPayment(id: string) {
    const updated = await apiJson<Subscription>(
      `/api/subscriptions/${id}/confirm`,
      {
        method: "POST",
        headers: { "idempotency-key": crypto.randomUUID() },
      },
    );
    setData((prev) =>
      sortSubscriptions(prev.map((item) => (item.id === id ? updated : item))),
    );
    return updated;
  }

  return {
    subscriptions: sortSubscriptions(subscriptions),
    addSubscription,
    removeSubscription,
    confirmPayment,
  };
}
