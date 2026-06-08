---
name: competitor-signals-dismiss-generate
description: Add Dismiss and Generate buttons to Competitor Intelligence feed cards, with URL scraping and no-competitor-attribution content generation
metadata:
  type: project
---

# Competitor Signals: Dismiss + Generate

**Date:** 2026-06-07
**Status:** Approved (rev 2 — architectural review incorporated)

## Overview

The Competitor Intelligence tab (`CompetitorIntelligenceFeed.tsx`) shows cards for competitor blog posts, YouTube, Twitter, and GDELT news signals. Currently each card has only a "View →" link. This spec adds:

1. **Dismiss** — removes the card from the feed (client-side only)
2. **Generate** — opens an inline draft panel to create content for any network, using the competitor article as context but never citing or attributing the competitor as a source

Generate shows on **all** competitor cards, including news signal cards with no URL.

---

## Architecture

### Files changed

| File | Change |
|------|--------|
| `components/feed/CompetitorIntelligenceFeed.tsx` | Track `dismissedIds` in local state; pass `onDismiss` to `ContentCard`; filter dismissed items |
| `components/feed/CompetitorIntelligenceFeed.tsx > ContentCard` | Add Dismiss + Generate buttons to footer; render `CompetitorIntelDraftPanel` below itself |
| `components/feed/CompetitorIntelDraftPanel.tsx` | **New.** Purpose-built draft panel for competitor intel items |
| `app/api/draft/competitor-intel/route.ts` | **New.** Validates URL, conditionally scrapes, generates with no-attribution + originality constraints |

### Files untouched

`DraftPanel.tsx`, `SignalCard.tsx`, `CompetitorPostCard.tsx`, `CompetitorCard.tsx` — no changes.

### Long-term note

This introduces a third generation route (alongside `/api/draft/generate` and `/api/instagram/generate`). As Feed Intelligence expands to Website Signals, Knowledge Signals, and Social Listening, consider consolidating around a shared `generateDraft({ sourceType, sourceContext, format, tone, workspaceContext })` service with source-specific adapters. Not required for this launch, but the route structure here should follow a pattern compatible with that future consolidation.

---

## Section 1: UI / UX

### ContentCard footer

Current layout (right-aligned):

```
[ View → ]
```

New layout:

```
[ View → ]   [ Dismiss ]   [ Generate ]
```

**Dismiss button** — ghost style (transparent bg, `#e5e7eb` border, `#9ca3af` text, `fontSize: 12px, fontWeight: 500`). Matches Dismiss style on `SignalCard` and `CompetitorPostCard`. Clicking immediately removes the card from the feed. No undo. No backend call.

**Generate button** — solid style (workspace accent color `var(--workspace-accent, #1a1560)`, white text, `fontSize: 12px, fontWeight: 600`). Toggles `CompetitorIntelDraftPanel`. When panel is open, label reads "Close."

### CompetitorIntelDraftPanel

Renders below the card (same pattern as `DraftPanel`), styled identically. Structure:

- **Header row:** Label "Generate from Competitor Signal" (left) + `×` close button (right)
- **Network tabs:** LinkedIn · Twitter · Blog · Newsletter · Instagram (same as `DraftPanel`)
- **Tone selector:** Authoritative / Conversational / Provocative / Educational (same as `DraftPanel`)
- **Draft text area:** Pre-wrap, min-height 120px, white bg, `#e5e7eb` border, `#374151` text
- **Action row:** `[ Copy ]` + `[ Regenerate ]` — both appear once a draft is generated
  - Copy: clipboard copy, label flips to "Copied!" for 1.5s
  - Regenerate: calls the same endpoint again for a fresh variation (bypasses component state cache)
- **Attribution line:** "Signal source: Competitor Intelligence · Content generated from signal context" — no competitor URL, no competitor domain cited

On open: immediately fires a generation request for LinkedIn + Authoritative (default). Switching network or tone triggers a new request. Previously generated combinations are cached in component state and reused on tab switch-back (no re-fetch). Regenerate bypasses this cache for the current format/tone combination.

---

## Section 2: Data Flow

### Dismiss

Pure client-side. `CompetitorIntelligenceFeed` holds:

```ts
const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
```

`onDismiss(id)` adds `id` to the set. Items filtered before render. No API call. Dismissed state resets on page reload (acceptable).

### Caching

**Component state only.** `draft_cache` has a FK constraint to `signal_cards(id)` so it cannot be reused for competitor intel items (which use URL strings or `competitor_content_global` UUIDs as IDs). The component-level cache — a `Record<DraftFormat, string>` per panel instance — provides good UX within a session.

If persistent caching is required later, create a dedicated `competitor_draft_cache` table rather than retrofitting `draft_cache`.

### Generate — API endpoint

**Route:** `POST /api/draft/competitor-intel`

**Request body:**

```ts
{
  item_id:           string        // identifier (may be a URL string for RSS items)
  item_url:          string        // may be empty string for news signals
  item_title:        string
  item_summary:      string | null // pre-existing excerpt from feed data
  item_content:      string | null // pre-existing content from feed data
  item_topics:       string[]
  competitor_domain: string
  format:            'linkedin' | 'twitter' | 'blog' | 'newsletter' | 'instagram'
  tone:              'authoritative' | 'conversational' | 'provocative' | 'educational'
}
```

**Response:** `{ draft: string }`

**Server logic:**

1. Auth check via `getSession()`
2. Input validation (required fields, enum checks for format/tone)
3. **Build article context** — prefer existing data, scrape only as fallback:

   ```ts
   if (item_content || item_summary) {
     // Use pre-existing excerpt — fast path, no scrape
     context = item_content ?? item_summary
   } else if (item_url is a valid public HTTPS URL) {
     // Scrape fallback
     try {
       const article = await scrapeUrl(item_url)
       context = article.markdownContent.slice(0, 2000 words)
     } catch {
       context = item_title  // last resort
     }
   } else {
     context = [item_title, item_topics.join(', ')].filter(Boolean).join(' — ')
   }
   ```

4. **SSRF validation** — before any scrape call, validate `item_url` against a blocklist (see Section 3)
5. **Fetch workspace brand context** (parallel with any scrape):
   - `getBrandContext()` → `brand_profiles.brand_name`, `brand_profiles.tone_traits`, `brand_imagery_profiles.negative_rules`
   - `workspace_feed_settings` → `content_topics`, `services`, `tone_preference`
6. **Generate via `callClaude`** with system prompt built from workspace brand context + hard constraint block (see below)
7. Return `{ draft }`

**No DB caching.** Each request generates fresh. Component state handles repeat renders.

**Prompt version constant:** `PROMPT_VERSION = '1.0.0'` (independent of `/api/draft/generate` versioning).

**Use `callClaude`** (Anthropic / Claude), not OpenAI — consistent with website-intelligence and Instagram generation.

---

## Section 3: Constraints and Safety

### Hard constraint block (injected into system prompt)

```
ORIGINALITY AND ATTRIBUTION RULES — NON-NEGOTIABLE:

1. Use the signal only to identify the topic, trend, discussion, or market movement.
2. Do not summarize, paraphrase, reproduce, or closely mirror the source article.
3. Create an original perspective, framework, opinion, lesson, or insight that reflects
   the workspace's expertise and voice.
4. Do not link to, cite, mention, name, or attribute any content to ${competitor_domain}
   or any external competitor source.
5. Do not include any external URLs.
6. The output must read entirely as the workspace's original thought leadership.
   There should be no indication this content was informed by a competitor's article.
```

### SSRF protection

Before calling `scrapeUrl(item_url)`, validate the URL:

```ts
function isSafeUrl(url: string): boolean {
  let parsed: URL
  try { parsed = new URL(url) } catch { return false }

  if (parsed.protocol !== 'https:') return false

  const host = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return false

  // Block private IP ranges (simplified check — use a library in production)
  if (/^10\./.test(host))           return false
  if (/^192\.168\./.test(host))     return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false

  // Block cloud metadata endpoints
  if (host === '169.254.169.254')   return false  // AWS/GCP/Azure IMDS
  if (host === 'metadata.google.internal') return false

  return true
}
```

If `isSafeUrl` returns false, skip scraping and fall back to the title/summary context.

### Format instructions

Same as `/api/draft/generate`:

```
linkedin:    ~1200 characters, professional narrative, 3–4 paragraphs, no hashtags
twitter:     ~280 characters, punchy, single insight, optional 1–2 hashtags
blog:        ~300 word intro paragraph, hook + context + thesis, no hashtags
newsletter:  ~150 words, conversational, direct address to reader, no hashtags
instagram:   ~150 words + 5–8 relevant hashtags, visual storytelling language
```

---

## Section 4: Error Handling

| Scenario | Behavior |
|----------|----------|
| Scrape blocked / timeout / 403 | Silent fallback to `item_summary` or `item_title`. No error shown. |
| SSRF-blocked URL | Skip scrape silently, use pre-existing context. |
| Generation API failure | Inline error in panel: "Failed to generate. [Retry]" — same pattern as `DraftPanel`. |
| No URL + no summary + no content | Generate from title alone. Still produces output. |
| Regenerate | Calls endpoint again, replaces current format/tone entry in component state cache. |

---

## Implementation Notes

- `CompetitorIntelDraftPanel` holds draft state per format:

  ```ts
  const [draftContent, setDraftContent] = useState<Record<DraftFormat, string>>({
    linkedin: '', twitter: '', blog: '', newsletter: '', instagram: '',
  })
  ```

  Switching back to a previously generated format uses the cached value (no re-fetch). Regenerate explicitly clears and re-fetches the current format/tone.

- The `item_id` for RSS-sourced items is the article URL string. Fine as a local state key; no DB interaction.

- `item_content` maps to `CompetitorContentItem.content` (scraped from RSS description); `item_summary` maps to `CompetitorContentItem.summary`. Both are passed from the card to the panel. This is the fast path — most RSS items already have a 280-char excerpt.

- `maxDuration = 60` on the route (standard for generation; no streaming needed here).
