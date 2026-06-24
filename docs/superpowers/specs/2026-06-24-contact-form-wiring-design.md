# Contact Form Wiring — Design

**Date:** 2026-06-24
**Status:** Approved (design), pending implementation plan
**Owner:** Lauren Proctor

## Problem

The public contact page at [`app/(marketing)/contact/page.tsx`](../../../app/(marketing)/contact/page.tsx)
(production: <https://clout.you/contact/>) renders a form collecting first name, last
name, email, and message — but on submit it only calls `setSent(true)`. **No data is
sent anywhere.** Submissions are silently lost.

## Goal

Wire the existing form to a real backend that:

1. Persists every submission to the database.
2. Notifies the Clout inbox of each new submission.
3. Auto-replies to the submitter confirming receipt.

The form is on the marketing site and is **public / unauthenticated**.

## Decisions

| Decision | Choice |
| --- | --- |
| Destination | **Email + DB table** — persist to a new `contact_submissions` table *and* email the inbox, so nothing is lost if email fails. |
| Auto-reply | **Yes** — send a branded confirmation email to the submitter. |
| Spam protection | **Honeypot only** — hidden field; if filled, silently accept and drop. |

This mirrors the existing `support_requests` stack
([`app/api/support/route.ts`](../../../app/api/support/route.ts),
[`lib/domain/support.ts`](../../../lib/domain/support.ts),
[`lib/email/resend.ts`](../../../lib/email/resend.ts),
[`supabase/migrations/20260422500_support_requests.sql`](../../../supabase/migrations/20260422500_support_requests.sql)).

## Components

### 1. Migration — `supabase/migrations/20260618002_contact_submissions.sql`

New table modeled on `support_requests`:

```sql
create table if not exists contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  first_name  text not null,
  last_name   text not null,
  email       text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

alter table contact_submissions enable row level security;
-- All access via service role only — no client-facing policies needed
```

RLS enabled with **no client policies** — all access is service-role-only, identical to
`support_requests`. The `20260618002` prefix is the next free sequence number after the
existing `20260618000` / `20260618001` migrations.

### 2. Domain — `lib/domain/contact.ts`

```ts
createContactSubmission(params: {
  firstName: string
  lastName: string
  email: string
  message: string
}): Promise<DomainResult<{ id: string }>>
```

Inserts via `createServiceClient()` and returns the same `DomainResult` shape as
`createSupportRequest` — `{ ok: true, data: { id } }` or `{ ok: false, error }`.

### 3. Email — extend `lib/email/resend.ts`

- **`sendContactNotification(params)`** — plain-text email **to `hi@clout.you`** (the
  "general inquiries" address shown on the page), same construction style as
  `sendSupportNotification`. Body includes name, email, and message.
- **`sendContactAutoReply(params)`** — branded "we received your message" email **to the
  submitter's email**, rendered through the same template/render path used by other
  user-facing emails ([`lib/email/send.ts`](../../../lib/email/send.ts) +
  `lib/email/templates/`). Adds a new template `lib/email/templates/contact-received.tsx`.
- Both send `from` the already-verified **clout.so** domain, matching the existing
  `Clout Support <support@clout.so>` FROM.

### 4. API route — `app/api/contact/route.ts`

Public `POST`, **no auth** (marketing page).

- Parse body: `firstName`, `lastName`, `email`, `message`, plus honeypot field `company`.
- **Honeypot:** if `company` is non-empty, return `{ ok: true }` immediately without
  storing or emailing — bots believe they succeeded.
- **Validation:** all four real fields required and non-empty; `email` must match a basic
  email format. Return `400 { error }` on failure.
- Insert via `createContactSubmission`. On DB error return `500 { error }`.
- Fire-and-forget both emails (`.catch(() => {})`) so email failure never fails the
  user's submission — same pattern as the support route.
- Return `{ ok: true }`.

### 5. Frontend — `app/(marketing)/contact/page.tsx`

- Convert the four inputs to controlled React state.
- Add a hidden honeypot input (`company`) — visually hidden, `tabIndex={-1}`,
  `autoComplete="off"`.
- Add `submitting` and `error` state.
- Replace the fake `onSubmit` (`setSent(true)`) with an async handler that
  `fetch('/api/contact', { method: 'POST', … })`, sets `submitting` during the request,
  shows `error` on failure, and only flips to the **existing** success view on `res.ok`.
- Disable the submit button while `submitting`.

## Data Flow

```text
User submits form
  → POST /api/contact (public)
     → honeypot check (drop silently if tripped)
     → validate fields
     → createContactSubmission()  → contact_submissions row
     → sendContactNotification()  → hi@clout.you        (fire-and-forget)
     → sendContactAutoReply()     → submitter's email   (fire-and-forget)
     → { ok: true }
  → form shows existing "Thanks — we'll be in touch" success state
```

## Error Handling

- Honeypot tripped → `200 { ok: true }`, nothing stored/sent.
- Invalid/missing fields → `400 { error }`, surfaced inline on the form.
- DB insert failure → `500 { error }`, surfaced inline on the form.
- Email send failure → logged/swallowed; submission still succeeds (DB row is the source
  of truth).

## Testing

- Domain: `createContactSubmission` success and DB-error paths.
- API route: honeypot drop, validation failures (missing fields, bad email), happy path
  inserts a row and returns `{ ok: true }`, email failures don't fail the response.
- Frontend: submit calls the endpoint and renders success on `ok`, renders error on
  failure, honeypot field present and hidden.

## Config Dependency

- `RESEND_API_KEY` must be set (already used elsewhere).
- The clout.so sending domain (e.g. `hi@clout.so`) must be verified in Resend for the
  FROM addresses. Notification **to** address is `hi@clout.you`.

## Out of Scope (YAGNI)

- Rate limiting / CAPTCHA (honeypot only, per decision).
- Admin UI to browse `contact_submissions` (query directly for now).
- Wiring the placeholder social links in the page footer.
