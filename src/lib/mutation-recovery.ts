export type MutationRecovery = () => void | Promise<void>;

/**
 * Run mutation recovery for its side effect only. Recovery owns reconciliation
 * (normally a server refetch); a render snapshot must never be written back
 * after that refetch completes.
 */
export async function runMutationRecovery(recover?: MutationRecovery): Promise<void> {
  await recover?.();
}
