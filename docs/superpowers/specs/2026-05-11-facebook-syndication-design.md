# Facebook Syndication Platform — Design Spec

**Date:** 2026-05-11  
**Status:** Draft — pending implementation

---

## Context

Clout's syndication engine generates platform-optimized content from source articles. It currently supports X, LinkedIn, Threads, Substack, and Blog. This spec adds Facebook as a sixth platform, generating posts optimized for both personal profiles and Pages via a single generation path with variant controls.

---

## Behavior Model

Facebook occupies a distinct rhetorical space: a personal-social feed where friends, family, news, and brands compete for the same scroll. Unlike LinkedIn (professional authority) or X (compressed discourse), Facebook performance is driven by emotional resonance, personal narrative, and genuine comment engagement.

### Rhetorical Environment

Facebook is a mixed-context feed. The dominant scroll behavior is casual and social — people arrive to see what friends are doing, not to learn. Content that performs well presents as something a trusted person would share: a personal reaction to an article, a story triggered by an idea, a genuine question. Posts that perform poorly read as information delivery, marketing, or LinkedIn-style authority signaling.

### Structural Rules

- **First 250 characters are the hook** — mobile truncates at ~3 lines before "See more." The lead must make the reader want to continue or engage immediately.
- **Personal story arc outperforms information delivery** — what happened, why it matters to me, what I think now.
- **Short conversational paragraphs** — 1–3 sentences per block. Dense prose breaks on mobile.
- **End with a genuine engagement hook** — a question that invites the reader's own experience or opinion. Facebook's algorithm prioritizes comments.
- **Link preview handles the "what"** — when a URL is shared, Facebook auto-generates a preview card. The post text should provide context and reaction, not summarize the article.
- **No hashtags** — hashtags suppress organic reach on Facebook. Do not include any.

### Length Target

- **Personal profile:** 150–300 words (sweet spot for engagement without "wall of text" penalty)
- **Page/brand:** 80–150 words (shorter, more benefit-focused)
- Default generation targets the personal profile range; "More Page-ready" variant shifts downward

### Anti-Patterns

- Hashtags of any kind (actively harmful to reach)
- Corporate or marketing language ("excited to share," "thrilled to announce")
- LinkedIn authority cadence (short-line stacking, competence signaling)
- Generic calls to action ("check this out," "link below," "click here")
- Thread formatting (numbered posts, multi-part arcs — wrong surface)
- Pure information delivery without personal framing or reaction
- Dense prose blocks without paragraph breaks

---

## Card Design

**Layout:** Full-width (`col-span-full`), consistent with LinkedIn and X cards.

**"See more" simulation:** Truncate display at 250 chars with a "see more" expand control, mirroring Facebook's native mobile behavior.

**Header:** Platform name + descriptor + word count (not dwell time; word count is more intuitive for Facebook's shorter format).

**Intelligence section:** Shows engagement mechanics, emotional register, narrative style, and `platform_risks.facebook` adaptation note.

**Variant controls (6):**

| Label | Instruction |
|---|---|
| More personal | Lean into first-person narrative and personal reaction. Make it feel like sharing from your own experience. |
| More Page-ready | Shift toward brand/creator voice. Shorter, more benefit-focused, appropriate for a business or creator Page. |
| Shorter / punchier | Tighten to under 150 words. Cut any setup that doesn't earn its place. |
| Add engagement question | End with a specific, genuine question that invites the reader's own experience or opinion. |
| More conversational | Casual register, natural sentence rhythm. Should read like a real person talking. |
| More emotional | Lead with emotional stakes and personal resonance before the argument or insight. |

---

## Token Budget

**maxTokens: 600**  
Facebook's sweet spot (150–300 words) requires ~200–400 generation tokens. 600 provides enough headroom for Page-ready variants that may include brief calls to action.

---

## Files Changed

| File | Change |
|---|---|
| `lib/syndication/types/intelligence.ts` | Add `'facebook'` to `Platform` union type; add to `PLATFORM_LABELS` and `PLATFORM_DESCRIPTORS` |
| `lib/syndication/platforms/facebook.ts` | **NEW** — `FACEBOOK_PLATFORM_MODEL` with full behavior model |
| `lib/syndication/registry.ts` | Import `FACEBOOK_PLATFORM_MODEL`; add `facebook` entry to `PLATFORM_REGISTRY` |
| `lib/syndication/schemas/syndicationSchema.ts` | Add `'facebook'` to Zod `.enum()` array |
| `app/(dashboard)/syndicate/FacebookCard.tsx` | **NEW** — full card component with 6 variant controls |
| `app/(dashboard)/syndicate/PlatformGrid.tsx` | Add `facebook: 6` to `SKELETON_BARS`; add Facebook card renderer in done branch |
| `app/(dashboard)/syndicate/SyndicationClient.tsx` | Add `'facebook'` to `ALL_PLATFORMS` and initial `selectedPlatforms` state |

---

## Verification

1. Load `/syndicate` — Facebook toggle appears in platform selector alongside the other 5
2. Submit a URL — Facebook card loads with a skeleton (6 bars), then renders generated content
3. Generated post: 150–300 words, personal narrative tone, no hashtags, ends with engagement question
4. "See more" truncation works at 250 chars; clicking expands
5. Intelligence section expands and shows relevant Facebook signals
6. Each of the 6 variant controls triggers a regeneration with the appropriate note
7. "More Page-ready" variant produces a shorter (80–150 word), more brand-appropriate post
8. No TypeScript errors; no regressions on other platform cards
