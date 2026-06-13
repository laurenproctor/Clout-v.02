# Substack Internal API — Research & Capability Gate

> **Status: REVIEW ARTIFACT ONLY.** This document justifies enabling a Substack capability.
> It is **never parsed or checked at runtime.** Runtime gating is done exclusively through
> `FEATURES.substackDirectPublish` and the `SUBSTACK_CAPABILITIES` constants in
> [`lib/features.ts`](../../lib/features.ts).
>
> A capability constant may flip to `true` only after the matching section below is filled
> in with **live captured request/response examples** and reviewed. Guessed payload shapes
> are not acceptable for production behavior — Substack's Notes and newsletter publishing
> endpoints are undocumented and internal, and can change without notice.

Substack publishing relies on undocumented internal endpoints. The safe default is
**draft-first**: create a draft via the verified draft endpoint, then let the user finish
in Substack's editor (the manual fallback). Direct web-publish and subscriber-email actions
must be captured and verified here before they are enabled.

---

## Capability → section mapping

| `SUBSTACK_CAPABILITIES` flag | Gated action (`intended_action`)    | Required section below          |
| ---------------------------- | ----------------------------------- | ------------------------------- |
| `newsletterDraft` (✅ true)  | `substack_newsletter_draft`         | [Draft creation](#draft-creation) |
| `notesPublish` (❌ false)    | `substack_note_publish`             | [Notes publishing](#notes-publishing) |
| `newsletterPublishWeb` (❌)  | `substack_newsletter_publish_web`   | [Web publish](#web-publish)     |
| `newsletterSendEmail` (❌)   | `substack_newsletter_send_email`    | [Email / send behavior](#email--send-behavior) |

---

## Session verification

- **Endpoint:** _TBD — capture live_
- **Method / headers / cookies:** _TBD_
- **Request example:** _TBD_
- **Response example:** _TBD_
- **Notes:** how a valid session is recognised; how expiry presents.

## Publication discovery

- **Endpoint:** _TBD — capture live_
- **Request example:** _TBD_
- **Response example:** _TBD_
- **Notes:** how `publication_subdomain` / `publication_name` are resolved; multi-publication accounts.

## Draft creation

- **Status:** VERIFIED (existing provider creates drafts today).
- **Endpoint:** `POST https://{subdomain}.substack.com/api/v1/post` (see [`client.ts`](../../lib/publishing/providers/substack/client.ts)).
- **Request example:** _document the exact captured payload_
- **Response example:** _document the captured response incl. stable `id` + `url`_

## Notes publishing

- **Endpoint:** _TBD — capture live before enabling `notesPublish`_
- **Request example:** _TBD_
- **Response example (must include a stable id + url):** _TBD_
- **Notes:** Notes publish immediately (no draft concept) — confirm idempotency behaviour on retry.

## Web publish

- **Endpoint:** _TBD — capture live before enabling `newsletterPublishWeb`_
- **Request example:** _TBD_
- **Response example:** _TBD_
- **Notes:** confirm exactly how "publish to web" is distinguished from "send email." Do **not**
  enable until this distinction is captured and unambiguous.

## Email / send behavior

- **Endpoint:** _TBD — capture live before enabling `newsletterSendEmail`_
- **Request example:** _TBD_
- **Response example:** _TBD_
- **Audience controls:** how free vs paid vs all subscribers is selected, if at all.
- **Notes:** this is the highest-risk action (irreversible audience notification). Requires
  verified payload fields for audience/send behaviour **and** the in-app confirmation dialog.

---

## Review checklist before flipping a capability

- [ ] Section filled with live captured request **and** response.
- [ ] Response contains a stable provider id and a public URL (or fallback rules documented).
- [ ] Retry/idempotency behaviour observed and documented.
- [ ] For send-email: audience selection fields captured.
- [ ] Reviewer sign-off recorded here with date.
