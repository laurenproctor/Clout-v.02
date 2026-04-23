# Bug Log

_Updated: 2026-04-23_

## Fixed This Sprint

| Bug | Severity | File | Status |
|-----|----------|------|--------|
| Voice draft blank after transcription | Critical | `components/capture/voice-capture-flow.tsx`, `app/api/generate/route.ts` | Fixed |
| `gen.id` fallback — field doesn't exist in response | High | `components/capture/voice-capture-flow.tsx:161` | Fixed |
| Lens load failure silent — Generate button disabled with no explanation | Medium | `components/capture/capture-composer.tsx:89-99` | Fixed |
| Init fetch errors swallowed (workspace, profile, lenses) | Medium | `components/capture/capture-composer.tsx:89-99` | Fixed |
| Upload regen failure silent — empty catch block | Medium | `components/capture/upload-capture-flow.tsx:191` | Fixed |
| URL compose retry blocked — `didProcess.current` never reset on error | Medium | `components/capture/link-capture-flow.tsx:79` | Fixed |
| Error boundary missing `componentDidCatch` logging | Low | `components/shell/error-boundary.tsx` | Fixed |

## Findings (No Change Needed — Already Correct)

| Finding | Detail |
|---------|--------|
| Studio LinkedIn post — loading state | Already implemented: `disabled={postingToLinkedIn}`, "Posting…" label, error + success states |
| Error boundary coverage | `ErrorBoundary` wraps entire dashboard layout — all compose and Studio surfaces covered |
| Queue state sync | Server-driven with atomic transitions. Polling-only (no WebSocket) is acceptable for v1 |
| LinkedIn token refresh | Auto-refreshes before publish attempt in `lib/domain/publishing.ts` |
| Duplicate publish protection | Idempotency check on `providerPostId` in `/api/channels/linkedin/post/route.ts` |

## Remaining Issues (Out of Scope This Sprint)

| Issue | Priority | Notes |
|-------|----------|-------|
| LinkedIn post only available at `approved` status | Medium | By design — requires review → approve flow. May need direct-post shortcut for power users |
| No real-time queue updates | Low | Polling on mount only. Acceptable for v1 |
| Twitter publishing not implemented | Low | Schema exists, no OAuth/API. Out of scope |
| Newsletter publishing not implemented | Low | Schema exists, no sender. Out of scope |
| No request timeout on `fetch()` calls in components | Low | Can hang on slow networks |
