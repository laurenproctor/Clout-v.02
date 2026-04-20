# Transactional Email System — Design Spec
**Date:** 2026-04-20
**Status:** Approved

---

## Overview

Add production-ready transactional email to Clout using Resend + React Email, delivered via a single Trigger.dev dispatcher task. Three email types: welcome (on signup), output ready (on output approval), and payment failed (on Stripe invoice failure). Full observability via `email_events` table, idempotency on all sends, HTML + plain text rendering, and an operator preview route.

---

## Architecture

Three layers:

1. **React Email templates** (`lib/email/templates/`) — one `.tsx` file per email type, each exporting `renderHtml(props)` and `renderText(props)`
2. **Email domain functions** (`lib/email/send.ts`) — calls Resend SDK with both HTML and plain text, writes result to `email_events`
3. **Single Trigger.dev dispatcher task** (`lib/trigger/jobs/dispatch-email.ts`) — accepts a typed union payload, checks idempotency, renders template, calls send function

**Trigger points:**
- `welcome` → Clerk webhook at `/api/webhooks/clerk` on `user.created`
- `output_ready` → `PATCH /api/outputs/[id]` when status transitions to `'approved'`
- `payment_failed` → Stripe webhook at `/api/webhooks/stripe` on `invoice.payment_failed`

---

## Dispatcher Task

Single Trigger.dev task `dispatch-email` with `retry: { maxAttempts: 3 }` and exponential backoff.

### Payload type

```ts
type EmailPayload =
  | { type: 'welcome'; userId: string; email: string; displayName: string }
  | { type: 'output_ready'; outputId: string; userId: string; email: string; outputTitle: string; outputBody: string }
  | { type: 'payment_failed'; workspaceId: string; invoiceId: string; email: string; planName: string; amount: number; currency: string; gracePeriodDays: number }
```

### Task flow

1. Derive idempotency key from payload type (see below)
2. Query `email_events` — if a `sent` record exists for that key, log and return early (no duplicate send)
3. Insert a `pending` record into `email_events`
4. Render HTML and plain text from the matching template
5. Call `sendEmail()` — passes both renders to Resend
6. Update `email_events` record to `sent` (with `resend_id`) or `failed` (with `error`)

---

## Idempotency Keys

| Email type | Key format |
|---|---|
| welcome | `welcome:{userId}` |
| output_ready | `output_ready:{outputId}` |
| payment_failed | `payment_failed:{workspaceId}:{invoiceId}` |

---

## email_events Table

```sql
create table email_events (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text unique not null,
  type text not null,                    -- 'welcome' | 'output_ready' | 'payment_failed'
  recipient_email text not null,
  user_id uuid references users(id) on delete set null,
  workspace_id uuid references workspaces(id) on delete set null,
  payload jsonb,
  status text not null default 'pending', -- 'pending' | 'sent' | 'failed'
  resend_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index email_events_idempotency_key_idx on email_events(idempotency_key);
create index email_events_user_id_idx on email_events(user_id);
create index email_events_workspace_id_idx on email_events(workspace_id);
create index email_events_type_status_idx on email_events(type, status);
```

RLS: readable by `is_super_admin` only (operator observability). No user-facing access.

---

## Templates

All templates follow Clout's zinc design language. Each exports two functions:

```ts
export function renderHtml(props: Props): string  // React Email → HTML string
export function renderText(props: Props): string  // Plain text fallback
```

### Welcome email
- **Subject:** `Welcome to Clout, {displayName}`
- **Content:** Brief intro to what Clout does, CTA button → `/capture/new`
- **Plain text:** Same content, no formatting

### Output ready email
- **Trigger:** Output status → `approved`
- **Subject:** `Your output is ready`
- **Content:** Output title, full output body, CTA button → `/studio/{outputId}`
- **Plain text:** Title + body as plain paragraphs

### Payment failed email
- **Subject:** `Action required: payment failed`
- **Content:** Plan name, formatted amount + currency, grace period notice ("Your access continues for {gracePeriodDays} days"), CTA button → `/billing`
- **Plain text:** Same info as prose

---

## Trigger.dev Wiring

### trigger.config.ts (new file at project root)
```ts
import { defineConfig } from '@trigger.dev/sdk/v3'

export default defineConfig({
  project: process.env.TRIGGER_PROJECT_ID!,
  dirs: ['lib/trigger/jobs'],
})
```

### /api/trigger route handler (new)
Standard Trigger.dev webhook receiver — required for task invocation from the Vercel deployment.

### Environment variables (additions)
- `TRIGGER_PROJECT_ID` — from Trigger.dev dashboard
- `RESEND_API_KEY` — from Resend dashboard
- `EMAIL_FROM` — verified sender address (e.g. `hello@clout.app`)

---

## Operator Preview Route

**Path:** `/operator/email-preview`

- Lists all three email types with seed data previews
- Each card has HTML / Plain text toggle
- HTML view renders template in a sandboxed `<iframe>`
- Plain text view renders in a `<pre>` block
- No send functionality — view only
- Protected by existing operator auth middleware

---

## File Structure

```
lib/
  email/
    templates/
      welcome.tsx
      output-ready.tsx
      payment-failed.tsx
    send.ts              -- sendEmail(payload, html, text): writes email_events + calls Resend
lib/
  trigger/
    jobs/
      dispatch-email.ts  -- single dispatcher task
app/
  api/
    trigger/
      route.ts           -- Trigger.dev webhook receiver
  (operator)/
    operator/
      email-preview/
        page.tsx
trigger.config.ts
```

---

## Error Handling

- If Resend returns an error, the task throws — Trigger.dev retries up to 3 times
- After 3 failures, `email_events` record is updated to `failed` with the error message
- Failed sends are visible in the operator preview route and Trigger.dev dashboard
- Idempotency check uses `status = 'sent'` only — a `failed` record will be retried on next task dispatch

---

## Out of Scope (v1)

- Unsubscribe / preference management
- Email open/click tracking
- Digest or lifecycle emails
- Migrating existing generation/transcription/enrichment jobs to Trigger.dev
