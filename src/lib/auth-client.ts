"use client";

import { apiJson, apiJsonWithStatus } from "./api-client";
import { scopeClientCache } from "./client-cache";

export type Account = {
  id: string;
  email: string;
  displayName: string;
  active: boolean;
  emailVerified: boolean;
  roles: string[];
  permissions: string[];
};

type ProvisioningPending = {
  code: "ACCOUNT_PROVISIONING";
  retryAfterMs: number;
};

type ProvisioningStatus = {
  status: "READY" | "PROVISIONING";
  retryAfterMs?: number;
};

export async function authenticate(
  mode: "login" | "register",
  input: { email: string; password: string; displayName?: string },
): Promise<Account> {
  const { data, status } = await apiJsonWithStatus<Account | ProvisioningPending>(
    `/api/v1/auth/${mode}`,
    {
      method: "POST",
      body: JSON.stringify(mode === "register"
        ? { email: input.email, password: input.password, displayName: input.displayName }
        : { email: input.email, password: input.password }),
    },
  );

  if (status === 202) {
    await waitForProvisioning((data as ProvisioningPending).retryAfterMs);
    const account = await apiJson<Account>("/api/v1/auth/me");
    scopeClientCache(account.id);
    return account;
  }

  const account = data as Account;
  scopeClientCache(account.id);
  return account;
}

async function waitForProvisioning(initialDelay: number): Promise<void> {
  let delayMs = initialDelay;
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    const status = await apiJson<ProvisioningStatus>("/api/v1/auth/provisioning-status");
    if (status.status === "READY") return;
    delayMs = status.retryAfterMs ?? delayMs;
  }
  throw new Error("Account setup is taking longer than expected. Please try signing in again.");
}
