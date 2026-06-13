# LinkedIn — 5 hashtags, always pre-filled

**Date:** 2026-06-12
**Status:** Approved
**Scope:** LinkedIn generation flow only

## Problem

When creating a LinkedIn post, generated hashtags live in a separate `HashtagChips`
field beside the post body. Today the generation prompt asks for "3–5 hashtags," so the
count varies and the field can come back short or empty — leaving the user to add them
manually. The user wants every LinkedIn post to arrive with **exactly 5** common,
high-reach hashtags already filled in, requiring zero manual work.

## Decision

Keep the existing dedicated hashtag field (cleaner separation; already auto-appended at
publish via `formatLinkedInText`). Do **not** put hashtags in the post body. Instead:

1. Make the generation prompt request **exactly 5** hashtags.
2. Guarantee the field is never short via a deterministic normalization/backfill step.
3. Prefer **common, high-discoverability** hashtags that aid reach — not niche/obscure
   ones — in both the prompt and the backfill pool.

Published output is identical to today's mechanism; only the count and the
"always full" guarantee change.

## Changes

All changes are in `lib/linkedin/runGeneration.ts`. No other files change. Downstream
(chips UI, save route, publish-time append) is untouched.

### 1. Prompt — request exactly 5 common hashtags

- `buildSystemPrompt` AVOID line (currently `Hashtag stuffing — 3–5 max, placed at the
  end only`) → instruct **exactly 5**, placed at the end only, and that they should be
  **common, high-reach tags that aid discoverability** (not niche/obscure).
- JSON schema example (currently `hashtags: ['leadership', 'strategy', 'operations',
  'growth']`, 4 items) → show **5** items so the model anchors on 5.
- `buildUserMessage` per-variation instruction (currently `3–5 hashtags (no # prefix)`)
  → `exactly 5 hashtags (no # prefix) — common, widely-followed tags that improve reach`.

### 2. Normalization + backfill (the "always full" guarantee)

Add a pure helper, applied to each variation's `hashtags` in the `parsed.variations.map`
step (currently `runGeneration.ts:221-231`):

```
normalizeHashtags(raw: string[]): string[]
  - strip leading '#', trim whitespace
  - drop blanks
  - de-duplicate (case-insensitive)
  - cap at 5 (if the model over-delivers)
  - if fewer than 5, backfill from FALLBACK_TAGS (skipping any already present)
    until length === 5
  - return exactly 5
```

`FALLBACK_TAGS` is a small constant pool of common, broadly high-performing professional
LinkedIn tags (e.g. `leadership`, `strategy`, `growth`, `business`, `innovation`,
`careers`, `marketing`). The pool only needs enough entries to top up to 5 from any
starting count, so ≥7 tags is sufficient.

This backfill is a rare safety net — with the prompt asking for exactly 5, the model
almost always returns 5 and the pool is never touched.

## Out of scope

- Other platforms (Threads, Instagram, X, etc.) keep their existing per-platform
  hashtag rules.
- The post body is not modified; no dedup against `formatLinkedInText` needed.
- The "Regenerate hashtags" affordance in `HashtagChips` is unchanged.

## Testing

- Unit test `normalizeHashtags`: returns exactly 5 for inputs of length 0, 3, 5, and 7;
  strips `#`; de-duplicates case-insensitively; backfill entries are distinct from
  existing ones.
- Verify the prompt strings reference "exactly 5" and the JSON example has 5 entries.
