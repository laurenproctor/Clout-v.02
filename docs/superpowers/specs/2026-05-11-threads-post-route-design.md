# Threads Post API Route

**Date:** 2026-05-11
**Scope:** Add `app/api/channels/threads/post/route.ts` + `acquirePublishLock()` in publishing domain

## Context

All Threads infrastructure is already built — OAuth flow, token management, API client, and `publishThreadsOutput()`. The missing pieces are:

1. `app/api/channels/threads/post/route.ts` — the HTTP endpoint that triggers publishing
2. `acquirePublishLock()` — a reusable atomic lock in the publishing domain that prevents duplicate publishes from concurrent requests (double-click, retry collisions, queue worker overlap)

The existing `markPublishing()` in `lib/domain/publishing.ts` is close but only accepts `status = 'queued'`, which is correct for the scheduler but too restrictive for manual-trigger routes. A separate `acquirePublishLock()` with broader conditions covers the manual case.

## Publish Lock Design

**Location:** `lib/domain/publishing.ts` (reusable by LinkedIn, X, and any future platform route)

**Function signature:**

```ts
export async function acquirePublishLock(outputId: string): Promise<{ ok: boolean }>
```

**DB operation (atomic):**

```sql
UPDATE outputs
SET status = 'publishing', updated_at = now()
WHERE id = $1
  AND status != 'publishing'
  AND provider_post_id IS NULL
```

Returns `{ ok: true }` if exactly one row was updated. Returns `{ ok: false }` if zero rows were affected — meaning the output is already publishing or already published. No separate `releasePublishLock` is needed: `markPublished` and `markFailed` both transition out of `'publishing'`, which is the natural release.

## Route Design

**File:** `app/api/channels/threads/post/route.ts`
**Method:** POST
**Body:** `{ outputId: string }`

**Flow:**

```txt
1. Authenticate session → 401 if missing
2. Validate outputId in body → 400 if missing
3. getOutput(outputId) → 404 if not found or wrong workspace
4. If output.providerPostId is set → return { ok: true, postId, alreadyPublished: true }
5. acquirePublishLock(outputId) → 409 if lock fails
6. publishThreadsOutput(output)
7. On success: markPublished(outputId, postId) → 200 { ok: true, postId }
8. On error: markFailed(outputId, message) → 401 for token_expired, 502 otherwise
```

Step 4 (idempotency on `providerPostId`) happens before the lock attempt — no point acquiring the lock on an already-published post. The lock at step 5 catches the race between two concurrent requests that both pass step 4.

**Error handling:** `markFailed` is called in the catch block (not `finally`) because `finally` runs even on success, and we must not overwrite a successful `markPublished`. The catch block captures the error message before calling `markFailed`.

## Response Shapes

**Already published:**

```json
{ "ok": true, "postId": "...", "alreadyPublished": true }
```

**Publish in progress (lock not acquired):**

```json
{ "error": "Publish already in progress", "code": "publish_in_progress" }
```

HTTP 409

**Success:**

```json
{ "ok": true, "postId": "..." }
```

**Auth error (expired token):**

```json
{ "error": "...", "code": "token_expired" }
```

HTTP 401

**Provider error:**

```json
{ "error": "...", "code": "..." }
```

HTTP 502

## Files

| File                                          | Change                         |
|-----------------------------------------------|--------------------------------|
| `app/api/channels/threads/post/route.ts`      | Create — new POST route        |
| `lib/domain/publishing.ts`                    | Add `acquirePublishLock()`     |

## Imports (route)

```ts
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { publishThreadsOutput, acquirePublishLock, markPublished, markFailed } from '@/lib/domain/publishing'
```

## Reusability

`acquirePublishLock` is not Threads-specific. The LinkedIn and X post routes (when added) should use the same function. The queue worker's `markPublishing` can remain as-is — it's intentionally restricted to `queued` items.

## Verification

- POST with valid `outputId` → publishes and returns `{ ok: true, postId }`
- POST same `outputId` again (published) → `{ ok: true, alreadyPublished: true }`
- Two concurrent POSTs → first succeeds, second returns 409
- POST without session → 401
- POST without `outputId` → 400
- POST with `outputId` from wrong workspace → 404
- Expired token → 401 with `code: token_expired`
- Provider API failure → 502, output status set to `failed`
