# Bug Fixes for Production Issues

## 1. Google Calendar Connection Status Caching

**Issue:** Connecting to Google Calendar succeeds, but the settings panel continues to show disconnected. The user has to clear cookies and log in again to see the updated status.
**Root Cause:** Next.js aggressively caches GET Route Handlers. Even though the database updated correctly after the OAuth flow, the fetch request for `/api/google-calendar/connection` returned a cached response from before the connection. Clearing cookies bypassed this because it wiped the persisted query cache in `localStorage` and caused a fresh session request.
**Fix:** Added `export const dynamic = "force-dynamic";` and `export const fetchCache = "force-no-store";` to the following routes:
- `app/api/google-calendar/connection/route.ts`
- `app/api/google-calendar/calendars/route.ts`
- `app/api/google-calendar/events/route.ts`
This forces Next.js to always execute the route handler and return fresh data from the database.

## 2. Logout Button Not Working

**Issue:** Clicking the Logout button does not work.
**Root Cause:** The `logout()` function in `AccountPage` made a raw `fetch("/api/auth/sign-out", { method: "POST" })` call. This did not clear the Better Auth session cookies properly because Better Auth clients have specific logic for signing out.
**Fix:** Created `src/lib/auth-client.ts` to export the `better-auth/react` client. Updated `src/components/auth/account-page.tsx` to use `await authClient.signOut()`, ensuring the session is completely terminated and cookies are cleared.

## 3. Tasks Not Syncing to Google Calendar

**Issue:** Tasks are created but don't sync. The BullMQ logs show: `Task <id> was deleted or lacks calendar before event creation. Skipping.`
**Root Cause:** A race condition in `app/api/todos/route.ts`. The API endpoint added the `createEvent` job to the BullMQ queue *before* inserting the new task into the database. Because BullMQ processes jobs asynchronously (and very quickly), the worker would query the database for the task, find nothing (since the `INSERT` hadn't completed), and abort the sync process.
**Fix:** Rearranged the logic in `app/api/todos/route.ts` so that `db.insert(todos).values(...)` completes fully before `googleCalendarQueue.add(...)` is called. Also ensured `task.syncStatus` is set to `"pending_sync"` before the insertion.
