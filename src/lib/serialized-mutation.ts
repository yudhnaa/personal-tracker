export type SerializedMutationQueueOptions = {
  isActive?: () => boolean;
  inactiveError?: () => Error;
};

/**
 * Serialize mutation factories so a later request cannot overtake an earlier
 * one. Factories are invoked only when their turn begins, which also prevents
 * queued account-A work from picking up account-B credentials after logout.
 */
export function createSerializedMutationQueue(options: SerializedMutationQueueOptions = {}) {
  let tail: Promise<void> = Promise.resolve();
  let disposed = false;
  let generation = 0;

  const assertActive = (expectedGeneration: number) => {
    if (
      !disposed
      && expectedGeneration === generation
      && (options.isActive?.() ?? true)
    ) return;
    throw options.inactiveError?.() ?? new Error("Mutation queue is inactive");
  };

  return {
    enqueue<R>(operation: () => Promise<R>): Promise<R> {
      const queuedGeneration = generation;
      const run = async () => {
        assertActive(queuedGeneration);
        return operation();
      };
      const result = tail.then(run, run);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
    activate(): void {
      disposed = false;
    },
    dispose(): void {
      disposed = true;
      generation += 1;
    },
    whenIdle(): Promise<void> {
      return tail;
    },
  };
}
