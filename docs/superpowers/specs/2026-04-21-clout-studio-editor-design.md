# Clout Studio Editor — Design Spec
**Date:** 2026-04-21  
**Status:** Approved for implementation

---

## Context

The current `/studio/[id]` editor is a functional but visually undifferentiated form. It uses a centered max-w-3xl scrolling layout with stacked inputs. The goal is to replace it with a premium, focused editor experience — Linear × Notion × creator SaaS — that makes editing feel intentional and fast, and surfaces AI refinement without a chatbot feel.

---

## Layout

Full-height, full-bleed layout (no max-width scroll column). Three zones:

```
┌─────────────────────────────────────────────────────────┐
│  Top bar: channel selector · autosave · AI Actions ✦    │
├──┬──────────────────────────────────────────────────────┤
│  │                                                      │
│ L│              Center editor (full-width)              │
│  │                                                      │
│  │   [inline suggestion blocks appear here]            │
│  │                                                      │
├──┴──────────────────────────────────────────────────────┤
│  Bottom bar: Copy · Queue · [status actions]            │
└─────────────────────────────────────────────────────────┘
```

**Left rail (36px, icon-only):** Variant switcher — letters A/B/C representing other outputs from the same generation. Active variant highlighted. Version history accessible via a clock icon at the bottom of the rail. Clicking a variant navigates to that output's `/studio/[id]` route.

**Center editor:** Full remaining width. Contains:
- Hook/title field (styled as a prominent heading input, no label)
- Body textarea (auto-height, no resize handle, grows with content)
- Hashtag pills row
- Inline suggestion blocks (see below) injected between hook and body when active

**Top bar:** Fixed, minimal height. Left: back arrow + breadcrumb. Center: channel selector (pill tabs if ≤3 channels, dropdown if more). Right: autosave indicator + `AI Actions ✦` button.

**Bottom bar:** Fixed. Left: word/char count. Right: `Copy ▾` (with format dropdown) · `Save to queue` · primary action button (context-sensitive: Save draft / Send for review / Approve / Mark published).

---

## AI Actions Panel

**Trigger:** `AI Actions ✦` button (top-right) or `Cmd+J`.

**Behavior:** Slides in from the right as an overlay panel (not pushing the editor). Width ~280px. The editor content remains visible behind it. Panel has a close button and closes on `Escape` or `Cmd+J` again.

**Grouped actions:**

| Group | Actions |
|-------|---------|
| **Improve** | Sharpen opener · Stronger CTA · Shorter · More elegant |
| **Transform** | Thread · Email · Carousel |
| **Voice** | More like me · More contrarian · More direct |

Each action is a button. Loading state shows a subtle spinner on the button while the API call runs.

---

## AI Action Behavior: Minor vs Major

**Minor actions** (Improve + Voice groups): result appears as an **inline suggestion block** injected into the editor between hook and body.

Inline suggestion block anatomy:
```
┌─────────────────────────────────────────────────────┐
│ ✦ SHARPEN OPENER                               [×]  │
│─────────────────────────────────────────────────────│
│  The top founders I know share one unfair trait:    │
│  they never wait for a green light.                 │
│─────────────────────────────────────────────────────│
│  [Apply]   [Compare]   [Dismiss]                    │
└─────────────────────────────────────────────────────┘
```

- **Apply**: replaces the relevant field (hook or body) with the suggestion, removes the block
- **Compare**: expands to stacked before/after view inside the editor — "Current" above, "Suggested" below — with Apply / Keep original buttons
- **Dismiss**: removes the block, no changes

**Major actions** (Transform group): result renders inside the AI panel itself, below the action list. A "Copy result" button appears. The panel stays open so the user can copy and paste as needed. No inline injection.

---

## API: `/api/ai-actions`

`POST /api/ai-actions`

Request:
```json
{
  "outputId": "uuid",
  "action": "sharpen_opener" | "stronger_cta" | "shorter" | "more_elegant" | "more_like_me" | "more_contrarian" | "more_direct" | "thread" | "email" | "carousel",
  "currentBody": "string",
  "currentTitle": "string"
}
```

Response:
```json
{
  "type": "minor" | "major",
  "field": "title" | "body" | null,
  "suggestion": "string",
  "label": "string"
}
```

Implementation: calls Claude (`callClaude` from `/lib/ai/generate.ts`) with a targeted system prompt per action. Uses the output's profile context (voice, tone) for Voice group actions. Minor actions return the refined field value only. Major actions return the full transformed content.

---

## Component Structure

Refactor the current single 639-line file into:

| File | Purpose |
|------|---------|
| `app/(dashboard)/studio/[id]/page.tsx` | Data fetching, state orchestration, layout shell |
| `components/studio/editor-body.tsx` | Hook input + body textarea + hashtags + inline suggestions |
| `components/studio/ai-actions-panel.tsx` | Slide-over panel with grouped actions + major transform results |
| `components/studio/inline-suggestion.tsx` | Suggestion block with Apply/Compare/Dismiss |
| `app/api/ai-actions/route.ts` | New POST endpoint |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+J` | Toggle AI Actions panel |
| `Cmd+S` | Manual save |
| `Escape` | Close AI panel / dismiss focused suggestion |

---

## Visual Style

- Background: `zinc-950` page, `zinc-900` rails, `white` or `zinc-50` editor surface
- Top/bottom bars: `zinc-900` with `zinc-800` borders
- AI panel: dark overlay `zinc-900` with `zinc-700` dividers
- Inline suggestion block: indigo-tinted (`indigo-950` bg, `indigo-700` border, `indigo-300` text)
- Typography: existing Geist Sans, editor body at `text-base` (not `text-sm`)
- Autosave indicator: subtle `zinc-500` dot + "Saved" text, no animation when idle

---

## Variants (Left Rail)

Query outputs sharing the same `generationId` as the current output. Show up to 3 as A/B/C. If only one output exists (no variants), the left rail is hidden. Clicking a variant navigates to `/studio/[variant-id]`.

Add API query: `GET /api/outputs?generation_id=<id>` (filter by generationId on existing `/api/outputs` route).

---

## Preserved Behaviors

All existing functionality is preserved:
- Autosave (2s debounce)
- Status flow (draft → review → approved → published)
- Regenerate with lens
- Export formats (plain / markdown / LinkedIn)
- Version history (moved to left rail clock icon)
- Delete / revert to draft

---

## Verification

1. Open any output at `/studio/[id]` — confirm full-height layout renders, no scrolling page
2. Edit body — confirm autosave fires after 2s
3. Press `Cmd+J` — confirm AI panel slides in from right
4. Click "Sharpen opener" — confirm loading state, then inline suggestion block appears
5. Click Apply on suggestion — confirm hook/body updates, block disappears
6. Click Compare — confirm stacked before/after view renders with Apply/Keep
7. Click "Thread" (Transform) — confirm result renders inside the panel, not inline
8. Click a variant in left rail (if multiple outputs exist for same generation) — confirm navigation
9. Confirm all existing status actions (Approve, Publish, etc.) work in bottom bar
10. Confirm `Cmd+S` saves manually
