import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

async function importTypeScriptModule(relativePath) {
  const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}#${crypto.randomUUID()}`);
}

async function importApiClientModule() {
  const directory = await mkdtemp(join(tmpdir(), "pt-api-client-"));
  const compilerOptions = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 };
  const cacheSource = await readFile(new URL("../src/lib/client-cache.ts", import.meta.url), "utf8");
  const apiSource = (await readFile(new URL("../src/lib/api-client.ts", import.meta.url), "utf8"))
    .replace('from "./client-cache"', 'from "./client-cache.mjs"');
  const cachePath = join(directory, "client-cache.mjs");
  const apiPath = join(directory, "api-client.mjs");
  await Promise.all([
    writeFile(cachePath, ts.transpileModule(cacheSource, { compilerOptions }).outputText),
    writeFile(apiPath, ts.transpileModule(apiSource, { compilerOptions }).outputText),
  ]);
  const api = await import(pathToFileURL(apiPath).href);
  const cache = await import(pathToFileURL(cachePath).href);
  return { api, cache };
}

test("CSRF refresh is shared and auth cookie rotation invalidates the cached token", async () => {
  let issuedToken = 0;
  let acceptedToken = "";
  let csrfRequests = 0;
  const mutationAttempts = new Map();

  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    if (url.pathname === "/api/v1/auth/csrf") {
      csrfRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 5));
      acceptedToken = `csrf-${++issuedToken}`;
      return Response.json({ csrfToken: acceptedToken });
    }

    const path = url.pathname;
    mutationAttempts.set(path, (mutationAttempts.get(path) ?? 0) + 1);
    const headers = new Headers(init.headers);
    const requestToken = headers.get("x-csrf-token");
    if (path !== "/api/v1/auth/login") {
      assert.equal(headers.get("x-client-account-id"), "account-a");
    }
    if (requestToken !== acceptedToken) {
      return Response.json({ code: "CSRF_INVALID" }, { status: 403 });
    }
    if (path === "/api/v1/auth/login") {
      acceptedToken = `rotated-${++issuedToken}`;
      return Response.json({ id: "account-1" });
    }
    return Response.json({ ok: true }, { status: 201 });
  };

  globalThis.window = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() };
  const { api: { gatewayFetch }, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");

  assert.equal((await gatewayFetch("/api/v1/bookmarks", { method: "POST" })).status, 201);
  assert.equal(csrfRequests, 1);

  acceptedToken = "externally-rotated";
  const [bookmark, habit] = await Promise.all([
    gatewayFetch("/api/v1/bookmarks", { method: "POST" }),
    gatewayFetch("/api/v1/habits", { method: "POST" }),
  ]);
  assert.equal(bookmark.status, 201);
  assert.equal(habit.status, 201);
  assert.equal(csrfRequests, 2, "concurrent failures must share one CSRF refresh");
  assert.equal(mutationAttempts.get("/api/v1/bookmarks"), 3);
  assert.equal(mutationAttempts.get("/api/v1/habits"), 2);

  assert.equal((await gatewayFetch("/api/v1/auth/login", { method: "POST" })).status, 200);
  assert.equal((await gatewayFetch("/api/v1/subscriptions", { method: "POST" })).status, 201);
  assert.equal(csrfRequests, 3, "login must invalidate the token cached before cookie rotation");
  assert.equal(mutationAttempts.get("/api/v1/subscriptions"), 1);
  delete globalThis.window;
});

test("client cache subject remains tab-local when another tab changes localStorage", async () => {
  const localStorage = new MemoryStorage();
  globalThis.window = { localStorage, sessionStorage: new MemoryStorage() };
  const cache = await importTypeScriptModule("../src/lib/client-cache.ts");

  assert.equal(cache.scopeClientCache("account-a"), true);
  assert.equal(cache.getActiveClientCacheSubject(), "account-a");
  const accountAScope = cache.captureClientCacheScope();
  assert.equal(cache.isClientCacheScopeCurrent(accountAScope), true);

  localStorage.setItem("pt_cache_subject", "account-b");
  assert.equal(cache.getActiveClientCacheSubject(), "account-a", "another tab must not mutate this tab's in-memory subject");
  assert.equal(cache.isClientCacheScopeCurrent(accountAScope), false, "shared storage must fence work before the storage event is delivered");

  cache.invalidateActiveClientCacheSubject();
  assert.equal(cache.getActiveClientCacheSubject(), null, "the affected tab must gate account data before refetching");

  assert.equal(cache.scopeClientCache("account-b"), true, "the current tab must still detect the account transition");
  assert.equal(cache.getActiveClientCacheSubject(), "account-b");

  delete globalThis.window;
});

test("client cache falls back to tab memory when browser storage is blocked", async () => {
  const blockedStorage = {
    getItem() { throw new DOMException("blocked", "SecurityError"); },
    setItem() { throw new DOMException("blocked", "SecurityError"); },
    removeItem() { throw new DOMException("blocked", "SecurityError"); },
    clear() { throw new DOMException("blocked", "SecurityError"); },
  };
  globalThis.window = { localStorage: blockedStorage, sessionStorage: blockedStorage };
  const cache = await importTypeScriptModule("../src/lib/client-cache.ts");

  assert.equal(cache.scopeClientCache("account-a"), true);
  const accountAScope = cache.captureClientCacheScope();
  assert.equal(cache.isClientCacheScopeCurrent(accountAScope), true);
  assert.equal(cache.scopeClientCache("account-b"), true);
  assert.equal(cache.isClientCacheScopeCurrent(accountAScope), false);
  assert.doesNotThrow(() => cache.clearUserCache());
  assert.equal(cache.getActiveClientCacheSubject(), null);

  delete globalThis.window;
});

test("an authenticated request cannot complete after the browser account changes", async () => {
  const localStorage = new MemoryStorage();
  globalThis.window = { localStorage, sessionStorage: new MemoryStorage() };
  const { api, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");

  let releaseResponse;
  globalThis.fetch = async () => {
    await new Promise((resolve) => { releaseResponse = resolve; });
    return Response.json([{ id: "note-from-a" }]);
  };

  const pending = api.apiJson("/api/v1/notes");
  while (!releaseResponse) await new Promise((resolve) => setTimeout(resolve, 0));
  localStorage.setItem("pt_cache_subject", "account-b");
  releaseResponse();

  await assert.rejects(pending, api.ClientSessionChangedError);
  delete globalThis.window;
});

test("same-tab account changes abort authenticated requests in flight", async () => {
  globalThis.window = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() };
  const { api, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");

  let requestStarted;
  globalThis.fetch = async (_input, init = {}) => {
    requestStarted?.();
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
  };
  const started = new Promise((resolve) => { requestStarted = resolve; });
  const pending = api.apiJson("/api/v1/notes");
  await started;
  cache.scopeClientCache("account-b");

  await assert.rejects(pending, api.ClientSessionChangedError);
  delete globalThis.window;
});

test("gateway account-context rejection immediately gates the stale browser tab", async () => {
  globalThis.window = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() };
  const { api, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");
  globalThis.fetch = async () => Response.json({
    code: "ACCOUNT_CONTEXT_CHANGED",
    message: "account changed",
  }, { status: 409 });

  await assert.rejects(api.apiJson("/api/v1/notes"), api.ClientSessionChangedError);
  assert.equal(cache.getActiveClientCacheSubject(), null);
  delete globalThis.window;
});

test("account-bound navigation carries the active account and rejects a stale tab", async () => {
  const localStorage = new MemoryStorage();
  globalThis.window = { localStorage, sessionStorage: new MemoryStorage() };
  const { api, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");

  const navigation = new URL(api.accountBoundGatewayNavigationUrl("/api/v1/google-calendar/connect"));
  assert.equal(navigation.pathname, "/api/v1/google-calendar/connect");
  assert.equal(navigation.searchParams.get("clientAccountId"), "account-a");

  localStorage.setItem("pt_cache_subject", "account-b");
  assert.throws(
    () => api.accountBoundGatewayNavigationUrl("/api/v1/google-calendar/connect"),
    api.ClientSessionChangedError,
  );
  delete globalThis.window;
});

test("gateway requests reject absolute URLs before credentials or security headers can leak", async () => {
  globalThis.window = { localStorage: new MemoryStorage(), sessionStorage: new MemoryStorage() };
  const { api, cache } = await importApiClientModule();
  cache.scopeClientCache("account-a");
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    return Response.json({ ok: true });
  };

  assert.throws(() => api.gatewayApiUrl("https://example.com/collect"), TypeError);
  await assert.rejects(
    api.gatewayFetch("//example.com/collect"),
    /Gateway requests require an API path/,
  );
  assert.equal(fetchCalled, false);
  delete globalThis.window;
});

test("logout errors are reconciled against the current server session", async () => {
  const { resolveLogoutSession } = await importTypeScriptModule("../src/lib/logout-session.ts");
  const unauthenticated = (error) => error?.status === 401;

  assert.deepEqual(
    await resolveLogoutSession(async () => undefined, async () => ({ id: "account-a" }), unauthenticated),
    { ended: true },
  );

  const transportError = new Error("network unavailable");
  assert.deepEqual(
    await resolveLogoutSession(
      async () => { throw transportError; },
      async () => ({ id: "account-a" }),
      unauthenticated,
    ),
    { ended: false, error: transportError, account: { id: "account-a" } },
  );

  assert.deepEqual(
    await resolveLogoutSession(
      async () => { throw new Error("response lost"); },
      async () => { throw { status: 401 }; },
      unauthenticated,
    ),
    { ended: true },
  );

  const sessionCheckError = new Error("session check unavailable");
  assert.deepEqual(
    await resolveLogoutSession(
      async () => { throw transportError; },
      async () => { throw sessionCheckError; },
      unauthenticated,
    ),
    { ended: false, error: sessionCheckError },
  );
});

test("settings writes are serialized and pending patches are coalesced", async () => {
  const { createSettingsSync } = await importTypeScriptModule("../src/lib/settings-sync.ts");
  const writes = [];
  const synced = [];
  let releaseFirst;
  const firstWrite = new Promise((resolve) => { releaseFirst = resolve; });
  let activeWrites = 0;
  let maxActiveWrites = 0;

  const sync = createSettingsSync({
    persist: async (patch) => {
      activeWrites += 1;
      maxActiveWrites = Math.max(maxActiveWrites, activeWrites);
      writes.push(patch);
      if (writes.length === 1) await firstWrite;
      activeWrites -= 1;
      return { boardTitle: patch.boardTitle ?? "Board", theme: patch.theme ?? "light" };
    },
    reload: async () => ({ boardTitle: "Board", theme: "light" }),
    onSynced: (persisted, pending) => synced.push({ persisted, pending }),
    onError: (error) => { throw error; },
  });

  sync.enqueue({ boardTitle: "P" });
  sync.enqueue({ boardTitle: "Pe" });
  sync.enqueue({ boardTitle: "Personal", theme: "dark" });
  releaseFirst();
  await sync.whenIdle();

  assert.equal(maxActiveWrites, 1, "settings PATCH requests must never overlap");
  assert.deepEqual(writes, [
    { boardTitle: "P" },
    { boardTitle: "Personal", theme: "dark" },
  ]);
  assert.deepEqual(synced[0].pending, { boardTitle: "Personal", theme: "dark" });
});

test("settings failures reload authoritative server state and remain visible", async () => {
  const { createSettingsSync } = await importTypeScriptModule("../src/lib/settings-sync.ts");
  const errors = [];
  const synced = [];
  const sync = createSettingsSync({
    persist: async () => { throw new Error("save failed"); },
    reload: async () => ({ boardTitle: "Server board", theme: "light" }),
    onSynced: (persisted, pending, source) => synced.push({ persisted, pending, source }),
    onError: (error) => errors.push(error.message),
  });

  sync.enqueue({ boardTitle: "Unsaved board" });
  await sync.whenIdle();

  assert.deepEqual(errors, ["save failed"]);
  assert.deepEqual(synced, [{
    persisted: { boardTitle: "Server board", theme: "light" },
    pending: {},
    source: "reload",
  }]);
});

test("settings queue drops pending account-A writes after its scope becomes inactive", async () => {
  const { createSettingsSync } = await importTypeScriptModule("../src/lib/settings-sync.ts");
  const writes = [];
  const synced = [];
  let active = true;
  let releaseFirst;
  const firstWrite = new Promise((resolve) => { releaseFirst = resolve; });
  const sync = createSettingsSync({
    persist: async (patch) => {
      writes.push(patch);
      await firstWrite;
      return { boardTitle: patch.boardTitle };
    },
    reload: async () => ({ boardTitle: "Server board" }),
    onSynced: (persisted) => synced.push(persisted),
    onError: (error) => { throw error; },
    isActive: () => active,
  });

  sync.enqueue({ boardTitle: "A-1" });
  sync.enqueue({ boardTitle: "A-2" });
  active = false;
  releaseFirst();
  await sync.whenIdle();

  assert.deepEqual(writes, [{ boardTitle: "A-1" }]);
  assert.deepEqual(synced, []);
});

test("settings sync reactivates after a Strict Mode cleanup", async () => {
  const { createSettingsSync } = await importTypeScriptModule("../src/lib/settings-sync.ts");
  const writes = [];
  const sync = createSettingsSync({
    persist: async (patch) => {
      writes.push(patch);
      return { boardTitle: patch.boardTitle };
    },
    reload: async () => ({ boardTitle: "Server board" }),
    onSynced: () => undefined,
    onError: (error) => { throw error; },
  });

  sync.dispose();
  sync.activate();
  sync.enqueue({ boardTitle: "After remount" });
  await sync.whenIdle();

  assert.deepEqual(writes, [{ boardTitle: "After remount" }]);
});

test("settings sync ignores a stale completion after reactivation", async () => {
  const { createSettingsSync } = await importTypeScriptModule("../src/lib/settings-sync.ts");
  const synced = [];
  let releaseOld;
  const oldBlocked = new Promise((resolve) => { releaseOld = resolve; });
  const sync = createSettingsSync({
    persist: async (patch) => {
      if (patch.boardTitle === "Old") await oldBlocked;
      return { boardTitle: patch.boardTitle };
    },
    reload: async () => ({ boardTitle: "Server board" }),
    onSynced: (persisted) => synced.push(persisted.boardTitle),
    onError: (error) => { throw error; },
  });

  sync.enqueue({ boardTitle: "Old" });
  sync.dispose();
  sync.activate();
  sync.enqueue({ boardTitle: "Current" });
  await sync.whenIdle();
  releaseOld();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(synced, ["Current"]);
});

test("latest mutation queue coalesces rapid note edits", async () => {
  const { createLatestMutationQueue } = await importTypeScriptModule("../src/lib/latest-mutation.ts");
  const writes = [];
  const saved = [];
  let releaseFirst;
  const firstWrite = new Promise((resolve) => { releaseFirst = resolve; });
  const queue = createLatestMutationQueue({
    persist: async (_id, draft) => {
      writes.push(draft);
      if (writes.length === 1) await firstWrite;
      return { id: "note-1", ...draft };
    },
    onSaved: (_id, note) => saved.push(note),
  });

  queue.enqueue("note-1", { title: "Note", text: "a" });
  for (let index = 2; index <= 100; index += 1) {
    queue.enqueue("note-1", { title: "Note", text: "a".repeat(index) });
  }
  releaseFirst();
  await queue.whenIdle();

  assert.equal(writes.length, 2, "rapid edits should produce one in-flight and one latest PATCH");
  assert.equal(writes[0].text, "a");
  assert.equal(writes[1].text, "a".repeat(100));
  assert.equal(saved.length, 1);
  assert.equal(saved[0].text, "a".repeat(100));
});

test("latest mutation queue reactivates after a Strict Mode cleanup", async () => {
  const { createLatestMutationQueue } = await importTypeScriptModule("../src/lib/latest-mutation.ts");
  const writes = [];
  const queue = createLatestMutationQueue({
    persist: async (id, draft) => {
      writes.push({ id, draft });
      return draft;
    },
    onSaved: () => undefined,
  });

  queue.dispose();
  queue.activate();
  queue.enqueue("note-1", { text: "saved after remount" });
  await queue.whenIdle();

  assert.deepEqual(writes, [{ id: "note-1", draft: { text: "saved after remount" } }]);
});

test("latest mutation queue ignores a stale completion after reactivation", async () => {
  const { createLatestMutationQueue } = await importTypeScriptModule("../src/lib/latest-mutation.ts");
  const saved = [];
  let releaseOld;
  const oldBlocked = new Promise((resolve) => { releaseOld = resolve; });
  const queue = createLatestMutationQueue({
    persist: async (_id, draft) => {
      if (draft.text === "old") await oldBlocked;
      return draft;
    },
    onSaved: (_id, draft) => saved.push(draft.text),
  });

  queue.enqueue("note-1", { text: "old" });
  queue.dispose();
  queue.activate();
  queue.enqueue("note-1", { text: "current" });
  await queue.whenIdle();
  releaseOld();
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(saved, ["current"]);
});

test("mutation recovery preserves the authoritative state loaded by recovery", async () => {
  const { runMutationRecovery } = await importTypeScriptModule("../src/lib/mutation-recovery.ts");
  let cache = "optimistic snapshot";

  await runMutationRecovery(async () => {
    cache = "authoritative server state";
  });

  assert.equal(cache, "authoritative server state");
  assert.equal(await runMutationRecovery(), undefined);
});

test("an already-aborted bookmark title lookup does not start either proxy", async () => {
  const { fetchPageTitle } = await importTypeScriptModule("../src/lib/fetch-title.ts");
  const controller = new AbortController();
  controller.abort();
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json({});
  };

  assert.equal(await fetchPageTitle("https://example.com", controller.signal), "");
  assert.equal(requests, 0);
});

test("aborting the first bookmark title proxy prevents the fallback proxy", async () => {
  const { fetchPageTitle } = await importTypeScriptModule("../src/lib/fetch-title.ts");
  const controller = new AbortController();
  let requests = 0;
  globalThis.window = {
    setTimeout,
    clearTimeout,
  };
  globalThis.fetch = async (_input, init = {}) => {
    requests += 1;
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(init.signal.reason), { once: true });
    });
  };

  const pending = fetchPageTitle("https://example.com", controller.signal);
  controller.abort();
  assert.equal(await pending, "");
  assert.equal(requests, 1, "the fallback proxy must not start after cancellation");
  delete globalThis.window;
});

test("serialized mutations cannot overtake each other", async () => {
  const { createSerializedMutationQueue } = await importTypeScriptModule("../src/lib/serialized-mutation.ts");
  const queue = createSerializedMutationQueue();
  const order = [];
  let releaseFirst;
  const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });

  const first = queue.enqueue(async () => {
    order.push("first:start");
    await firstBlocked;
    order.push("first:end");
    return 1;
  });
  const second = queue.enqueue(async () => {
    order.push("second:start");
    return 2;
  });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(order, ["first:start"]);
  releaseFirst();
  assert.deepEqual(await Promise.all([first, second]), [1, 2]);
  assert.deepEqual(order, ["first:start", "first:end", "second:start"]);
});

test("disposing a serialized mutation queue drops work that has not started", async () => {
  const { createSerializedMutationQueue } = await importTypeScriptModule("../src/lib/serialized-mutation.ts");
  const queue = createSerializedMutationQueue();
  let releaseFirst;
  let markFirstStarted;
  let secondStarted = false;
  const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
  const firstStarted = new Promise((resolve) => { markFirstStarted = resolve; });
  const first = queue.enqueue(async () => {
    markFirstStarted();
    return firstBlocked;
  });
  const second = queue.enqueue(async () => {
    secondStarted = true;
  });

  await firstStarted;
  queue.dispose();
  releaseFirst();
  await first;
  await assert.rejects(second, /inactive/);
  assert.equal(secondStarted, false);
});

test("a serialized mutation queue can reactivate after a Strict Mode cleanup", async () => {
  const { createSerializedMutationQueue } = await importTypeScriptModule("../src/lib/serialized-mutation.ts");
  const queue = createSerializedMutationQueue();
  queue.dispose();
  queue.activate();

  assert.equal(await queue.enqueue(async () => "saved"), "saved");
});

test("reactivating does not revive work queued before disposal", async () => {
  const { createSerializedMutationQueue } = await importTypeScriptModule("../src/lib/serialized-mutation.ts");
  const queue = createSerializedMutationQueue();
  let releaseFirst;
  let markFirstStarted;
  let staleStarted = false;
  const firstBlocked = new Promise((resolve) => { releaseFirst = resolve; });
  const firstStarted = new Promise((resolve) => { markFirstStarted = resolve; });

  const first = queue.enqueue(async () => {
    markFirstStarted();
    return firstBlocked;
  });
  const stale = queue.enqueue(async () => {
    staleStarted = true;
  });

  await firstStarted;
  queue.dispose();
  queue.activate();
  const current = queue.enqueue(async () => "current");
  releaseFirst();

  await first;
  await assert.rejects(stale, /inactive/);
  assert.equal(staleStarted, false);
  assert.equal(await current, "current");
});

test("Todo patch payload preserves the complete desired task state", async () => {
  const { buildTaskPatch } = await importTypeScriptModule("../src/features/todo/todo-mutation.ts");
  const payload = buildTaskPatch({
    id: "task-1",
    title: "Latest title",
    description: "Description",
    dueDate: "2026-08-24",
    status: "done",
    createdAt: 123,
    checklist: [],
    source: "local",
    syncStatus: "local_only",
    location: "Latest location",
  });

  assert.equal(payload.id, undefined);
  assert.equal(payload.createdAt, undefined);
  assert.equal(payload.title, "Latest title");
  assert.equal(payload.location, "Latest location");
  assert.equal(payload.doneAt, null);
});

test("Google event location patches preserve all-day state", async () => {
  const { buildGoogleEventPatch } = await importTypeScriptModule("../src/features/google-calendar/event-mutation.ts");
  const payload = buildGoogleEventPatch({
    connectionId: "connection-1",
    googleAccountId: "account-1",
    id: "event-1",
    calendarId: "calendar-1",
    title: "Event",
    description: "Description",
    location: "Old location",
    start: "2026-08-24",
    end: "2026-08-25",
    allDay: true,
    etag: null,
    htmlLink: null,
    updated: null,
  }, { location: "New location" });

  assert.equal(payload.location, "New location");
  assert.equal(payload.allDay, true);
  assert.equal(payload.start, "2026-08-24");
  assert.equal(payload.end, "2026-08-25");
});
