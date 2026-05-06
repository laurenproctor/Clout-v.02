# Syndication Engine — Design Spec
**Date:** 2026-05-06  
**Status:** Approved

---

## Context

Clout needs a fast, generation-first workflow for turning one piece of content into platform-native posts across X, LinkedIn, Substack, and Blog. The existing Syndicate feature runs a deep analytical pipeline (signals, narrative shape, counterfactual) optimized for diagnostic insight — too heavy for this use case.

The Syndication Engine is a separate product with a different goal: **minimum viable intelligence, maximum output quality, fast.**

The intelligence layer exists as hidden infrastructure. Users experience: paste → configure → generate → edit.

---

## Product Experience

```
Paste URL or text
→ toggle platforms (X / LinkedIn / Substack / Blog)
→ select lenses (optional)
→ "Generate Versions"
→ 2×2 card grid fills in per-platform as each completes
→ click any card → focused edit mode
```

---

## Architecture

### Pipeline

```
input (url | text)
→ extractContent()                    # reuse lib/syndicate/extract/extractContent.ts
→ syndicationIntelligencePass()       # NEW — lightweight Claude Sonnet call
→ SyndicationIntelligence object
→ parallel:
    generatePlatformOutput("x", intelligence, lenses)
    generatePlatformOutput("linkedin", intelligence, lenses)
    generatePlatformOutput("substack", intelligence, lenses)
    generatePlatformOutput("blog", intelligence, lenses)
→ stream outputs as each completes
→ render UI
```

**Hard constraint:** Platform generators receive only `SyndicationIntelligence` — never raw extracted content directly.

### File Structure

```
lib/syndication/
  types/
    intelligence.ts       # SyndicationIntelligence, SyndicationOutput, SyndicationRequest
    platforms.ts          # Platform type, PlatformBehaviorModel
    lenses.ts             # SyndicationLens (preset enum + workspace lens integration)
  intelligence/
    extractIntelligence.ts     # intelligence pass orchestrator
    intelligencePrompt.ts      # prompt for the intelligence pass
  platforms/
    x.ts                  # X behavior model
    linkedin.ts           # LinkedIn behavior model
    substack.ts           # Substack behavior model
    blog.ts               # Blog behavior model
  generation/
    generateOutput.ts     # per-platform generation call
    generationPrompt.ts   # builds prompt from intelligence + platform model + lenses
  schemas/
    syndicationSchema.ts  # Zod: input validation

app/(dashboard)/syndication/
  page.tsx                # full page UI

app/api/syndication/
  generate/route.ts       # POST — streaming ndjson
```

---

## Data Types

```ts
// lib/syndication/types/intelligence.ts

export type Platform = "x" | "linkedin" | "substack" | "blog"

export interface SyndicationIntelligence {
  thesis: string
  tone: string
  audience: string
  persuasive_mechanics: string[]
  authority_style: string
  emotional_style: string
  spreadability_patterns: string[]
  narrative_style: string
  platform_risks: Partial<Record<Platform, string>>
  key_quotes: string[]
  adaptation_constraints: string[]
}

export interface SyndicationOutput {
  platform: Platform
  content: string
  status: "generating" | "complete" | "error"
  error?: string
}

export interface SyndicationRequest {
  input: string          // URL or raw text
  platforms: Platform[]
  lenses: string[]       // preset lens names + workspace lens IDs
}
```

---

## Intelligence Pass

One Claude Sonnet call. Extracts only what's needed for strong platform-native adaptation.

**Input:** extracted content (title + body text from `extractContent`)  
**Output:** `SyndicationIntelligence` JSON  
**Model:** `claude-sonnet-4-6`  
**Target duration:** ~2–3s  

The prompt must:
- extract thesis, tone, audience, persuasive mechanics, authority style, emotional style
- identify spreadability patterns and key quotes
- flag adaptation constraints per platform (e.g., "length will need heavy compression for X")
- forbid generic analysis language, clichés, vague summaries

---

## Platform Behavior Models

Each platform model defines rhetorical environment, not formatting rules.

| Platform | Focus |
|---|---|
| X | Compression, quotability, identity signaling, conversational energy, repostability |
| LinkedIn | Competence framing, professional transformation, authority signaling, practical insight |
| Substack | Immersion, narrative pacing, thematic continuity, worldview development |
| Blog | Explanatory clarity, searchability, information hierarchy, evergreen utility |

---

## Generation Prompts

Per-platform generation prompt receives:
- `SyndicationIntelligence` object
- platform behavior model
- active lenses (as rhetorical modifiers)

Must explicitly forbid:
- shallow summarization
- generic AI phrasing
- "Here are X lessons" structures
- emoji spam
- preserving source sentence order
- mechanical restructuring

Must enforce:
- native platform feel
- platform-specific pacing and compression
- lens-influenced framing (stacked cleanly)

---

## Lens System

**Preset lenses (hardcoded):**
Contrarian, Founder, Intellectual, Technical, Emotional, Operator, Luxury, Investor

**Workspace lenses:** pulled from existing `lenses` table, surfaced alongside presets.

Lenses are stackable. Each lens injects rhetorical modifiers into the generation prompt (tone shift, framing direction, authority style). They do not alter the intelligence pass.

Lens display on cards: `Applied: Founder + Contrarian` — lightweight, below the platform label.

---

## API

```
POST /api/syndication/generate
Content-Type: application/json

{
  input: string,           // URL or raw text
  platforms: Platform[],
  lenses: string[]
}

Response: application/x-ndjson stream

// Progress frames:
{ type: "progress", phase: "extracting" | "analyzing" | "generating", platform?: Platform }

// Output frames (one per platform as they complete):
{ type: "output", platform: Platform, content: string }

// Error frame:
{ type: "error", platform?: Platform, message: string }

// Done:
{ type: "complete" }
```

---

## UI — Input State

- Large textarea: `Paste a post, article, thread, or essay…` (URL or text)
- Platform toggles: X · LinkedIn · Substack · Blog (multi-select)
- Lens chips: Contrarian · Founder · Intellectual · Technical · Emotional · Operator · Luxury · Investor + any workspace lenses
- CTA: **Generate Versions**

---

## UI — Loading State

Per-platform skeleton cards appear immediately in 2×2 grid. Cards fill in independently as each parallel generation completes, animating smoothly into place. This visually communicates independent reconstruction.

---

## UI — Results State

**Source Content** — collapsible bar above grid. Collapsed by default. Lightweight — not a permanent reference panel.

**2×2 card grid.** Cards are visually distinct:

| Platform | Card feel |
|---|---|
| X | Short, compressed, punchy. Max 3–4 lines visible. |
| LinkedIn | Medium length, authority register. |
| Substack | Visibly longer, editorial pacing. Scrollable preview. |
| Blog | Title + intro structure visible. |

Each card shows:
- Platform name + micro-descriptor (e.g., "Short-form · conversational · quotable")
- Applied lenses (if any): `Applied: Founder + Contrarian`
- Generated content preview
- Actions: **Copy** · **Edit** · **Regenerate [Platform] Version** · **Queue** · **Save Draft**

**Copy is a first-class action on the card** — no forced edit-mode entry.

---

## UI — Focused Edit Mode

Clicking a card expands into full edit mode (inline or modal). Supports:
- Free-text editing of the generated output
- Regenerate [Platform] Version (independent call using same intelligence object, cached in state)
- Queue for scheduling
- Save Draft
- Copy

The intelligence object is held in React state so regeneration doesn't re-run the intelligence pass.

---

## Content Extraction

Reuse `lib/syndicate/extract/extractContent.ts` directly. It handles both URLs and raw text input already.

---

## Streaming

The API streams ndjson. Client reads with `getReader()`, identical pattern to the existing `/api/syndicate/analyze` route. Per-platform `output` frames trigger card state transitions from skeleton → content.

---

## Design Principles

- Intelligence layer is invisible. No signal graphs, persuasion diagnostics, or ontology displays.
- Editorial, calm, minimal aesthetic. No neon, no engagement-bait language, no dashboard clutter.
- CTA is "Generate Versions" — reinforces adaptation, not generic generation.
- Regenerate buttons say "Regenerate X Version" / "Regenerate LinkedIn Version" — reinforces per-platform independence.

---

## Out of Scope (this phase)

- Publishing / auto-posting
- Social OAuth connections
- Scheduling automation
- Collaboration
- Analytics on generated content
