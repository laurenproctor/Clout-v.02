# Reliability Status

Updated: 2026-04-25

## Legend
- **GREEN** — reliable, no known issues
- **YELLOW** — unstable but usable, known caveats
- **RED** — broken

---

## Core Flows

| Flow | Status | Notes |
|------|--------|-------|
| Text compose | YELLOW | Capture → generate works. On generate error, silently navigates to capture detail with no user-visible error message. |
| URL compose | YELLOW | Fully synchronous (scrape + 3 Claude calls in one request). Works in dev; timeout risk on Vercel at scale. |
| Audio upload | YELLOW | Upload pipeline correct. Error messages from transcription/generation are generic ("Transcription failed") with no detail surfaced. |
| Transcription | YELLOW | Whisper API call works when OPENAI_API_KEY is set. Missing key returns 500 with no user-friendly message. |
| Generation | YELLOW | Claude call works reliably. JSON parsing has a silent fallback; generation limit check is before insert (correct). No user-visible error on generate failure from the composer. |
| Lenses | YELLOW | Depends on system lens rows in DB. If no system lens exists, generate returns 400 with no UI explanation. |
| Manual publish | YELLOW | LinkedIn direct-post works with idempotency. Status model (draft→review→approved→publish) is intact. Approval path via inbox. |
| Approval inbox | GREEN | Fixed: new users now get real slot suggestions (was returning null). Approve & Queue correctly transitions to queued with scheduled_at and approved_by. |
| Queue | GREEN | Backend worker has retry logic, idempotency, crash recovery. Queue page shows live status. |
| Weekly Plan widget | GREEN | Dashboard now shows upcoming plan items with inline approve. |
