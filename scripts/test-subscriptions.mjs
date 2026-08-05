import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/subscription-utils.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
});
const utils = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("monthly subscription confirmed after due date advances from existing renewal date", () => {
  assert.deepEqual(
    utils.resolveSubscriptionConfirmation(
      {
        billingCycle: "monthly",
        nextRenewalDate: "2026-08-10",
        confirmedRenewalDate: null,
      },
      "2026-08-15",
    ),
    {
      shouldAdvance: true,
      confirmedRenewalDate: "2026-08-10",
      nextRenewalDate: "2026-09-10",
    },
  );
});

test("multiple missed monthly cycles advance until the next future renewal date", () => {
  assert.equal(
    utils.advanceRenewalDate("2026-05-10", "monthly", "2026-08-15"),
    "2026-09-10",
  );
});

test("yearly subscriptions advance by calendar years until future", () => {
  assert.deepEqual(
    utils.resolveSubscriptionConfirmation(
      {
        billingCycle: "yearly",
        nextRenewalDate: "2025-08-10",
        confirmedRenewalDate: null,
      },
      "2026-08-15",
    ),
    {
      shouldAdvance: true,
      confirmedRenewalDate: "2025-08-10",
      nextRenewalDate: "2027-08-10",
    },
  );
});

test("end-of-month monthly renewal clamps to the next month's last day", () => {
  assert.equal(
    utils.advanceRenewalDate("2025-01-31", "monthly", "2025-01-31"),
    "2025-02-28",
  );
  assert.equal(
    utils.advanceRenewalDate("2024-01-31", "monthly", "2024-01-31"),
    "2024-02-29",
  );
});

test("duplicate confirmation for the same current renewal cycle is a no-op", () => {
  assert.deepEqual(
    utils.resolveSubscriptionConfirmation(
      {
        billingCycle: "monthly",
        nextRenewalDate: "2026-08-10",
        confirmedRenewalDate: "2026-08-10",
      },
      "2026-08-15",
    ),
    { shouldAdvance: false },
  );
});

test("duplicate confirmation with a different idempotency key after advancement is a no-op", () => {
  assert.deepEqual(
    utils.resolveSubscriptionConfirmation(
      {
        billingCycle: "monthly",
        nextRenewalDate: "2026-09-10",
        confirmedRenewalDate: "2026-08-10",
      },
      "2026-08-15",
    ),
    { shouldAdvance: false },
  );
});

test("concurrent confirmation decisions from the same cycle produce the same single advancement", () => {
  const current = {
    billingCycle: "monthly",
    nextRenewalDate: "2026-08-10",
    confirmedRenewalDate: null,
  };
  const first = utils.resolveSubscriptionConfirmation(current, "2026-08-15");
  const second = utils.resolveSubscriptionConfirmation(current, "2026-08-15");

  assert.deepEqual(first, second);
  assert.equal(first.nextRenewalDate, "2026-09-10");
});

test("subscriptions sort by urgency then renewal date", () => {
  const sorted = utils.sortSubscriptionsForToday(
    [
      item("normal-late", "2026-08-20"),
      item("due-soon-late", "2026-08-08"),
      item("overdue-late", "2026-08-04"),
      item("normal-early", "2026-08-09"),
      item("overdue-early", "2026-08-01"),
      item("due-soon-early", "2026-08-05"),
    ],
    "2026-08-05",
  );

  assert.deepEqual(
    sorted.map((subscription) => subscription.id),
    [
      "overdue-early",
      "overdue-late",
      "due-soon-early",
      "due-soon-late",
      "normal-early",
      "normal-late",
    ],
  );
});

function item(id, nextRenewalDate) {
  return {
    id,
    name: id,
    amount: 1,
    billingCycle: "monthly",
    nextRenewalDate,
    lastPaymentDate: null,
    status: "normal",
  };
}
