export type BillingCycle = "monthly" | "yearly";
export type SubscriptionStatus = "normal" | "due_soon" | "overdue";

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  lastPaymentDate: string | null;
  status: SubscriptionStatus;
};

export type SubscriptionCycleState = {
  billingCycle: BillingCycle;
  nextRenewalDate: string;
  confirmedRenewalDate: string | null;
};

const STATUS_ORDER: Record<SubscriptionStatus, number> = {
  overdue: 0,
  due_soon: 1,
  normal: 2,
};

export function subscriptionStatus(
  nextRenewalDate: string,
  todayIso: string,
): SubscriptionStatus {
  if (nextRenewalDate < todayIso) return "overdue";
  const dueMs = Date.UTC(
    Number(nextRenewalDate.slice(0, 4)),
    Number(nextRenewalDate.slice(5, 7)) - 1,
    Number(nextRenewalDate.slice(8, 10)),
  );
  const todayMs = Date.UTC(
    Number(todayIso.slice(0, 4)),
    Number(todayIso.slice(5, 7)) - 1,
    Number(todayIso.slice(8, 10)),
  );
  const daysUntilDue = Math.round((dueMs - todayMs) / 86400000);
  return daysUntilDue <= 3 ? "due_soon" : "normal";
}

export function sortSubscriptionsForToday(
  items: Subscription[],
  todayIso: string,
) {
  return [...items]
    .map((item) => ({
      ...item,
      status: subscriptionStatus(item.nextRenewalDate, todayIso),
    }))
    .sort((a, b) => {
      const statusDelta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (statusDelta !== 0) return statusDelta;
      return a.nextRenewalDate.localeCompare(b.nextRenewalDate);
    });
}

export function sortSubscriptions(items: Subscription[]) {
  return [...items].sort((a, b) => {
    const statusDelta = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDelta !== 0) return statusDelta;
    return a.nextRenewalDate.localeCompare(b.nextRenewalDate);
  });
}

export function resolveSubscriptionConfirmation(
  current: SubscriptionCycleState,
  todayIso: string,
) {
  if (current.confirmedRenewalDate === current.nextRenewalDate) {
    return { shouldAdvance: false as const };
  }
  if (current.confirmedRenewalDate && current.nextRenewalDate > todayIso) {
    return { shouldAdvance: false as const };
  }

  return {
    shouldAdvance: true as const,
    confirmedRenewalDate: current.nextRenewalDate,
    nextRenewalDate: advanceRenewalDate(
      current.nextRenewalDate,
      current.billingCycle,
      todayIso,
    ),
  };
}

export function advanceRenewalDate(
  renewalDate: string,
  billingCycle: BillingCycle,
  todayIso: string,
) {
  const months = billingCycle === "monthly" ? 1 : 12;
  let next = addCalendarMonths(renewalDate, months);
  while (next <= todayIso) {
    next = addCalendarMonths(next, months);
  }
  return next;
}

function addCalendarMonths(iso: string, monthsToAdd: number) {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const monthIndex = month - 1 + monthsToAdd;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = ((monthIndex % 12) + 12) % 12 + 1;
  const nextDay = Math.min(day, daysInMonth(nextYear, nextMonth));
  return [
    String(nextYear).padStart(4, "0"),
    String(nextMonth).padStart(2, "0"),
    String(nextDay).padStart(2, "0"),
  ].join("-");
}

function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
