export type LatestMutationQueueOptions<Key, Payload, Result> = {
  persist: (key: Key, payload: Payload) => Promise<Result>;
  onSaved: (key: Key, result: Result) => void;
  isActive?: () => boolean;
  retryDelayMs?: number;
};

type PendingMutation<Payload> = {
  payload: Payload;
  version: number;
  running: Promise<void> | null;
};

/**
 * Keep one request in flight per key and coalesce all later edits into the
 * latest pending payload. A failed current payload is retried while the queue
 * remains active; failures for superseded payloads advance immediately.
 */
export function createLatestMutationQueue<Key, Payload, Result>(
  options: LatestMutationQueueOptions<Key, Payload, Result>,
) {
  const pending = new Map<Key, PendingMutation<Payload>>();
  let disposed = false;
  const isActive = () => !disposed && (options.isActive?.() ?? true);
  const retryDelayMs = options.retryDelayMs ?? 1_500;

  async function drain(key: Key, entry: PendingMutation<Payload>): Promise<void> {
    while (isActive() && pending.get(key) === entry) {
      const payload = entry.payload;
      const version = entry.version;
      try {
        const saved = await options.persist(key, payload);
        if (!isActive() || pending.get(key) !== entry) return;
        if (entry.version !== version) continue;
        pending.delete(key);
        options.onSaved(key, saved);
        return;
      } catch {
        if (!isActive() || pending.get(key) !== entry) return;
        if (entry.version !== version) continue;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  return {
    activate(): void {
      disposed = false;
    },
    enqueue(key: Key, payload: Payload): void {
      if (!isActive()) return;
      const existing = pending.get(key);
      if (existing) {
        existing.payload = payload;
        existing.version += 1;
        return;
      }

      const entry: PendingMutation<Payload> = { payload, version: 1, running: null };
      pending.set(key, entry);
      entry.running = drain(key, entry);
    },
    clear(key: Key): void {
      pending.delete(key);
    },
    dispose(): void {
      disposed = true;
      pending.clear();
    },
    async whenIdle(): Promise<void> {
      await Promise.all([...pending.values()].map((entry) => entry.running));
    },
  };
}
