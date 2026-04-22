# Voice Capture Redesign — UX Spec
**Date:** 2026-04-21

## Problem
The old voice flow broke momentum: record → upload → save → blank spinner → "Generate now?" prompt. Users stopped before seeing value. The new flow collapses the distance between speaking and a finished draft.

## State Model

```
idle → recording → processing → draft_ready
                              ↘ error
```

No separate "transcribing" state — transcription and generation are one unified `processing` phase from the user's perspective.

## States

### idle
- Ring button (88×88, zinc-200 border) wrapping mic button (64×64, zinc-900)
- Headline: "Say it messy. We'll find the signal."
- Sub: "Record anything — a story, a rant, a hot take."
- Tap ring/button → starts recording

### recording
- Elapsed timer (tabular-nums, red dot pulse)
- 7-bar animated waveform (staggered bounce, red bars)
- Stop button (red, 64×64) inside ring (red-200 border pulse animation)
- "Tap to stop" label
- Tap stop → transitions to `processing` and immediately kicks off upload + transcribe + generate pipeline

### processing
- "✓ Capture saved" green badge appears first (immediate reassurance)
- Progress bar fills over real pipeline duration (~8–12s)
- Cycling microstates (fade crossfade, ~700ms each):
  1. Cleaning audio…
  2. Transcribing your words…
  3. Pulling out key ideas…
  4. Choosing the strongest angle…
  5. Drafting your post…
- Progressive transcript reveal (text appears in stages as % advances)
- Theme chips emerge at ~60% progress
- No spinner — motion from progress bar + text + chips provides forward momentum

### draft_ready
- "✓ Draft ready" green badge
- "Here's your first draft." eyebrow + lens badge (clickable → dropdown)
- Draft body: 16px, line-height 1.75, last paragraph bold
- Actions: "Use this draft →" (primary) | "Edit" (outline) | "↻ Try another angle" (ghost)
- Collapsible "Transcript · Themes" disclosure at bottom

### error
- ⚠ icon in red-50 circle
- Error message + "Your recording was saved. Try again or continue without transcription."
- "Try again" → returns to idle

## Component Architecture

```
VoiceCaptureFlow (components/capture/voice-capture-flow.tsx)
  - manages full state machine locally
  - contains: recording logic (MediaRecorder), upload (Supabase Storage), transcribe, generate
  - props: workspaceId, lenses, selectedLensId, onLensChange, onComplete(outputId), onError(msg)
```

The bottom bar (lens picker, target chips, CTA) lives in the parent `capture/new/page.tsx` — the component only owns the inner panel content.

## API Sequence (real mode)

1. `navigator.mediaDevices.getUserMedia` → `MediaRecorder`
2. On stop: upload blob → `supabase.storage.from('voice-captures').upload(filename, blob)`
3. `POST /api/capture` `{ source: 'voice', audio_path }` → `captureId`
4. `POST /api/capture/[captureId]/transcribe` → `{ transcript }`
5. `POST /api/generate` `{ capture_id, lens_id }` → `{ output_id, content }`
6. `onComplete(output_id)` → parent routes to `/studio/[output_id]`

## Demo Mode

`DEMO_MODE = false` (set to `true` to skip real API calls during development).
In demo mode: processing runs over 4s with canned transcript/themes/draft, auto-advances to `draft_ready`.

## Microcopy

| State | Key copy |
|---|---|
| idle | "Say it messy. We'll find the signal." |
| recording | "Listening…" / "Tap to stop" |
| processing | Cycling: "Cleaning audio…" → "Drafting your post…" |
| draft_ready | "Here's your first draft." |
| error | "Your recording was saved. Try again or continue." |

## Edge Cases

- **Mic denied**: caught in `getUserMedia` → `error` state with "Could not access microphone. Please check permissions."
- **Upload fails**: `error` state with "Upload failed. Please try again."
- **Transcription fails**: `error` state; capture is already saved so user can retry or navigate to capture detail
- **Generation fails**: same `error` state; capture + transcript are saved
- **`workspaceId` pending**: parent page fetches real workspace ID on mount from `/api/workspace`; component should not be rendered until ID is available (or uploads go to `pending/` path)

## Files

- `components/capture/voice-capture-flow.tsx` — component (new)
- `app/(dashboard)/capture/new/page.tsx` — wires VoiceCaptureFlow into voice panel
- `app/api/capture/[id]/transcribe/route.ts` — inline Whisper transcription (new)
