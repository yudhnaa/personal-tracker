export type SettingsSyncOptions<T extends object> = {
  persist: (patch: Partial<T>) => Promise<T>;
  reload: () => Promise<T>;
  onSynced: (persisted: T, pending: Partial<T>, source: "persist" | "reload") => void;
  onError: (error: unknown) => void;
  isActive?: () => boolean;
};

export function createSettingsSync<T extends object>(options: SettingsSyncOptions<T>) {
  let pending: Partial<T> = {};
  let disposed = false;
  let generation = 0;
  let runningGeneration: number | null = null;
  let idlePromise: Promise<void> = Promise.resolve();
  const isActive = (expectedGeneration = generation) => (
    !disposed
    && expectedGeneration === generation
    && (options.isActive?.() ?? true)
  );

  async function flush(): Promise<void> {
    if (!isActive()) {
      pending = {};
      return;
    }
    const flushGeneration = generation;
    if (runningGeneration === flushGeneration) return idlePromise;
    runningGeneration = flushGeneration;
    const currentIdlePromise = (async () => {
      try {
        while (isActive(flushGeneration) && Object.keys(pending).length > 0) {
          const patch = pending;
          pending = {};
          try {
            if (!isActive(flushGeneration)) return;
            const persisted = await options.persist(patch);
            if (!isActive(flushGeneration)) return;
            options.onSynced(persisted, pending, "persist");
          } catch (error) {
            if (!isActive(flushGeneration)) return;
            options.onError(error);
            try {
              const persisted = await options.reload();
              if (!isActive(flushGeneration)) return;
              options.onSynced(persisted, pending, "reload");
            } catch (reloadError) {
              if (!isActive(flushGeneration)) return;
              options.onError(reloadError);
            }
          }
        }
      } finally {
        if (runningGeneration === flushGeneration) runningGeneration = null;
      }
    })();
    idlePromise = currentIdlePromise;
    return currentIdlePromise;
  }

  return {
    activate(): void {
      disposed = false;
    },
    enqueue(patch: Partial<T>): void {
      if (!isActive()) return;
      pending = { ...pending, ...patch };
      void flush();
    },
    dispose(): void {
      disposed = true;
      generation += 1;
      pending = {};
    },
    whenIdle(): Promise<void> {
      return idlePromise;
    },
  };
}
