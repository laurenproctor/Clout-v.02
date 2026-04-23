# Publishing Engine Phase 2B — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the automated LinkedIn publishing engine so queued posts publish automatically at their scheduled times, with clean retry/fail handling and visible status in the queue UI.

**Architecture:** Almost all the pieces are already built — domain logic (`lib/domain/publishing.ts`), cron job (`lib/trigger/jobs/publish-scheduled.ts`), queue UI (`app/(dashboard)/queue/page.tsx`), dashboard widget, stats API, publish logs. The gaps are: (1) `trigger.config.ts` is missing so the cron task is never registered with Trigger.dev, (2) the PATCH route and `updateOutput()` don't support clearing `last_publish_error` on retry, and (3) migrations need to be pushed to Supabase.

**Tech Stack:** Trigger.dev SDK v4 (`@trigger.dev/sdk/v3`), Supabase, Next.js App Router, LinkedIn OAuth API, TypeScript.

---

## What Already Exists (do NOT rebuild)

| File | Status |
|------|--------|
| `supabase/migrations/20260421_publishing_foundations.sql` | ✅ `publish_logs` + `channel_credentials` tables |
| `supabase/migrations/20260422_scheduling.sql` | ✅ `scheduled_at` column + `queued` status |
| `supabase/migrations/20260423_publishing_engine.sql` | ✅ `publishing`/`failed` statuses + `last_publish_error` column |
| `lib/domain/publishing.ts` | ✅ `getDueQueuedPosts`, `publishLinkedInOutput`, `markPublished`, `markFailed`, `shouldRetry`, atomic guard |
| `lib/trigger/jobs/publish-scheduled.ts` | ✅ Cron task (`* * * * *`), 3 retries, exponential backoff |
| `app/(dashboard)/queue/page.tsx` | ✅ Queued/Publishing/Published/Failed UI, retry/reconnect/view post actions |
| `components/dashboard/PublishingEngine.tsx` | ✅ Dashboard widget with queued/published/failed counts |
| `app/api/publishing/stats/route.ts` | ✅ Stats endpoint |
| `lib/domain/publish-log.ts` | ✅ `createPublishLog`, `getPublishLogs` |
| `lib/linkedin.ts` | ✅ `postTextToLinkedIn`, `refreshLinkedInToken` |

## Files to Create

| File | Purpose |
|------|---------|
| `trigger.config.ts` | Registers cron task with Trigger.dev — **the critical missing piece** |

## Files to Modify

| File | Change |
|------|--------|
| `lib/domain/output.ts` | Add `lastPublishError?: string \| null` to `updateOutput()` params |
| `app/api/outputs/[id]/route.ts` | Destructure `last_publish_error` from body + pass to `updateOutput()` |

---

## Task 1: Apply pending migrations to Supabase

The migrations exist as SQL files but may not be applied to the live Supabase project yet.

**Files:** none (Supabase CLI command)

- [ ] **Step 1: Push all migrations**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
npx supabase db push
```

Expected output: migration files applied, no errors. If you see "already applied" for some — that's fine.

If `supabase db push` fails due to not being linked, run:
```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

The project ref is in `.env.local` — it's the subdomain part of `NEXT_PUBLIC_SUPABASE_URL` (e.g. `https://abcdefg.supabase.co` → project ref is `abcdefg`).

- [ ] **Step 2: Verify key columns exist**

Run this in the Supabase dashboard SQL editor to confirm:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'outputs'
  and column_name in ('scheduled_at', 'published_at', 'provider_post_id', 'last_publish_error', 'status')
order by column_name;
```

Expected: 5 rows returned.

```sql
select count(*) from publish_logs limit 1;
select count(*) from channel_credentials limit 1;
select count(*) from support_requests limit 1;
```

Expected: no "relation does not exist" errors.

- [ ] **Step 3: Verify output_status enum includes all values**

```sql
select enumlabel from pg_enum
join pg_type on pg_enum.enumtypid = pg_type.oid
where pg_type.typname = 'output_status'
order by enumsortorder;
```

Expected values: `draft`, `review`, `approved`, `queued`, `publishing`, `published`, `failed`, `archived`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/
git commit -m "chore: confirm publishing engine migrations applied"
```

---

## Task 2: Fix retry flow — clear last_publish_error on retry

The queue page sends `{ status: 'queued', last_publish_error: null }` on retry, but the PATCH route and `updateOutput()` don't handle `last_publish_error`. The error message stays visible after retry until the next publish attempt clears it via `markPublished()`.

**Files:**
- Modify: `lib/domain/output.ts` (function `updateOutput`, lines 107–141)
- Modify: `app/api/outputs/[id]/route.ts` (PATCH handler, lines 27–69)

- [ ] **Step 1: Add `lastPublishError` to `updateOutput()` params**

In `lib/domain/output.ts`, update the `updateOutput` function signature and body:

```typescript
export async function updateOutput(params: {
  outputId: string
  content?: OutputContent
  title?: string
  status?: OutputStatus
  approvedBy?: string
  channelId?: string | null
  providerPostId?: string | null
  publishedAt?: string | null
  scheduledAt?: string | null
  lastPublishError?: string | null  // ← add this line
}): Promise<DomainResult<Output>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .update({
      ...(params.content && { content: params.content as unknown as Json }),
      ...(params.title !== undefined && { title: params.title }),
      ...(params.status && { status: params.status }),
      ...(params.approvedBy && {
        approved_by: params.approvedBy,
        approved_at: new Date().toISOString(),
      }),
      ...(params.channelId !== undefined && { channel_id: params.channelId }),
      ...(params.providerPostId !== undefined && { provider_post_id: params.providerPostId }),
      ...(params.publishedAt !== undefined && { published_at: params.publishedAt }),
      ...(params.scheduledAt !== undefined && { scheduled_at: params.scheduledAt }),
      ...('lastPublishError' in params && { last_publish_error: params.lastPublishError }),  // ← add this line
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.outputId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toOutput(data as Record<string, unknown>) }
}
```

Note: use `'lastPublishError' in params` (not `params.lastPublishError !== undefined`) so that explicit `null` (clear the error) is passed correctly.

- [ ] **Step 2: Wire `last_publish_error` through the PATCH route**

In `app/api/outputs/[id]/route.ts`, update the PATCH handler:

```typescript
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { content, title, status, approve, channel_id, scheduled_at, last_publish_error } = body

  if (content) {
    await createOutputVersion({
      outputId: id,
      content: existing.data.content,
      editedBy: session.userId,
      changeSummary: 'Manual edit',
    })
  }

  const result = await updateOutput({
    outputId: id,
    ...(content && { content: content as OutputContent }),
    ...(title !== undefined && { title }),
    ...(status && { status }),
    ...(approve && { status: 'approved', approvedBy: session.userId }),
    ...(channel_id !== undefined && { channelId: channel_id === null ? null : channel_id }),
    ...(scheduled_at !== undefined && { scheduledAt: scheduled_at }),
    ...('last_publish_error' in body && { lastPublishError: last_publish_error }),  // ← add this line
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json(result.data)
}
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/domain/output.ts app/api/outputs/[id]/route.ts
git commit -m "fix: clear last_publish_error on retry via PATCH route"
```

---

## Task 3: Create trigger.config.ts — register the cron job

This is the critical missing piece. Without this file, `publish-scheduled.ts` is never deployed to Trigger.dev and the engine never fires.

**Files:**
- Create: `trigger.config.ts` (project root)

- [ ] **Step 1: Create `trigger.config.ts`**

Create `/Users/laurenproctor/Documents/Claude Code/Clout v.02/trigger.config.ts`:

```typescript
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID ?? '',
  dirs: ['lib/trigger/jobs'],
  maxDuration: 300,
})
```

`dirs` tells the CLI where to find task files. All four jobs (`publish-scheduled.ts`, `generate.ts`, `transcribe.ts`, `enrich-private.ts`) live in `lib/trigger/jobs/` and will be picked up automatically.

- [ ] **Step 2: Add `TRIGGER_PROJECT_ID` to `.env.local`**

Get your project ID from the Trigger.dev dashboard (it looks like `proj_xxxxxxxx`). Add to `.env.local`:

```
TRIGGER_PROJECT_ID=proj_xxxxxxxxxxxxxxxx
```

- [ ] **Step 3: Type-check**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
npx tsc --noEmit 2>&1
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add trigger.config.ts
git commit -m "feat: add trigger.config.ts to register publishing cron job"
```

---

## Task 4: Deploy to Trigger.dev and verify the schedule

- [ ] **Step 1: Deploy tasks**

```bash
cd "/Users/laurenproctor/Documents/Claude Code/Clout v.02"
npx trigger.dev@latest deploy
```

Expected output: all four tasks listed, `publish-scheduled-posts` shown with `cron: * * * * *` schedule.

If you see an authentication prompt, run `npx trigger.dev@latest login` first.

- [ ] **Step 2: Verify schedule in dashboard**

1. Open [cloud.trigger.dev](https://cloud.trigger.dev)
2. Navigate to your project → **Schedules**
3. Confirm `publish-scheduled-posts` appears with `* * * * *` cadence and status **Active**

- [ ] **Step 3: Manually trigger a test run**

In the Trigger.dev dashboard:
1. Go to **Tasks** → `publish-scheduled-posts`
2. Click **Test** → **Run**
3. Watch the run log — should see "no posts due" if queue is empty, or start processing if any queued posts exist

Expected log output (empty queue):
```
publish-scheduled: no posts due
```

- [ ] **Step 4: End-to-end smoke test**

Set a post to queued status with `scheduled_at` in the past using the Supabase SQL editor:

```sql
-- Find an approved output to test with
select id, title, status, channel_id from outputs
where status = 'approved'
  and channel_id is not null
limit 1;

-- Queue it with a past scheduled_at (replace <output-id> with the id from above)
update outputs
set status = 'queued', scheduled_at = now() - interval '1 minute'
where id = '<output-id>';
```

Then trigger a test run in the Trigger.dev dashboard. Expected:
- Run log shows "processing posts: 1"
- Row in `outputs` table transitions to `published` with `published_at` and `provider_post_id` set
- Row in `publish_logs` with `status = 'success'`
- Post visible on LinkedIn

- [ ] **Step 5: Verify idempotency**

Trigger a second test run immediately. Expected:
- Run log shows "no posts due" (the post is now `published`, not `queued`)
- No second LinkedIn post created
- `publish_logs` shows only one success entry

---

## Task 5: Verify failure/retry paths

- [ ] **Step 1: Verify failed state is visible in queue UI**

Manually set a post to failed with an error message:

```sql
update outputs
set status = 'failed',
    last_publish_error = 'LinkedIn account not connected. Go to Channels and reconnect your account.'
where id = '<output-id>';
```

Open `/queue` in the browser. Expected:
- Post appears in "Needs Attention" section
- Error message displayed in red
- "Reconnect", "Edit", and "Retry" buttons visible

- [ ] **Step 2: Verify retry clears the error**

Click **Retry** on the failed post. Expected:
- `PATCH /api/outputs/<id>` called with `{ status: 'queued', last_publish_error: null }`
- Post moves to "Upcoming" section
- Error message gone

- [ ] **Step 3: Verify dashboard widget**

Open `/dashboard`. Expected:
- "Publishing Engine" widget shows current counts
- Failed count shows red alert if any failures exist, links to `/queue`

---

## Verification Checklist

| Test case | Expected |
|-----------|----------|
| Due queued post → publishes | `status = published`, `provider_post_id` set, log row created |
| Second cron run after publish | Post not processed again (idempotency) |
| Retry clears error message | `last_publish_error = null`, status back to `queued` |
| Failed post visible in UI | Red error text, action buttons shown |
| Dashboard widget counts | Accurate queued/published/failed numbers |
| Schedule active in Trigger.dev | Dashboard shows `* * * * *`, status Active |
