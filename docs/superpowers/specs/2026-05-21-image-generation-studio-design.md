# Visuals — Strategic Visual Communication in Studio Editor

**Date:** 2026-05-21
**Status:** Design approved — pending implementation plan

---

## Context

The image generation backend is fully built: brand-aware prompt compilation (`lib/visual/`), OpenAI gpt-image-1 provider, Supabase Storage upload, and `visual_assets` DB persistence. The API endpoint (`POST /api/visual/generate`) accepts all generation controls. What's missing is a UI surface in the studio editor.

This feature is positioned as **strategic visual communication infrastructure** — not AI image generation tooling. The goal is to help creators frame their ideas visually for a specific audience, with a specific strategic intention, at brand fidelity. The moat is audience-aware visual framing, narrative-aware composition, and lens-informed visual identity. Visuals should optimize communication outcomes, not aesthetics.

---

## Naming Conventions

All components, copy, and internal references use "visual/visuals" language. Never "image generation," "AI image," or "generate image."

| Old | New |
|---|---|
| `ImageTab` | `VisualsTab` |
| `ImageControls` | `VisualControls` |
| `ImageGenerationPanel` | `VisualGenerationPanel` |
| Tab label "Image ✦" | Tab label **"Visuals"** |
| Button "Generate image" | Button **"Build visual direction"** |
| Button "Regenerate" | Button **"Rebuild"** |
| "Variation" | Directional refinement preset |

---

## Architecture

### Entry Point

A **"Visuals" tab** is added to the right panel in `app/(dashboard)/studio/[id]/page.tsx` alongside the existing "Preview" tab. The right panel is a 320px fixed column (`hidden lg:flex`). Tab state is `'preview' | 'visuals'`. Selecting "Visuals" mounts `<VisualsTab>`.

### New Components

**`components/studio/visuals-tab.tsx`**
Orchestrates the tab: loading/cancellation, API calls, session persistence, error state. Holds an `AbortController` ref; cancels in-flight requests on unmount and on tab switch.

**`components/studio/visual-controls.tsx`**
The visible controls form. Contains (top to bottom): Visual Objective, Audience Frame, Emotional Tone, Key Idea, and a collapsed "Visual Settings" accordion (aspect ratio, quality, advanced prompt override).

**`components/studio/visual-context.tsx`**
Collapsible section shown after first generation. Displays the system's inferred aesthetic direction in plain language derived from `visualIntent` fields — not the raw prompt.

### New API Routes

**`GET /api/visual/assets?outputId={id}`**
Returns visual assets for a post ordered by `created_at desc`. Used on tab mount to load the most recent generated visual.

**`GET /api/visual/sessions?outputId={id}`**
Returns the active `visual_generation_session` for a post. Used on tab mount to restore last-used settings.

**`POST /api/visual/sessions`**
Creates a new versioned session row after each successful generation.

**Updated `POST /api/visual/generate`**
Adds `visualObjective`, `audienceFrame`, and `lensContext` to the accepted body. All three pass through to `generateImage()` and the VisualIntent compiler.

### New DB Table: `visual_generation_sessions`

Sessions are append-only (versioned). The most recent `is_active = true` row is the current session for a post.

```sql
create table visual_generation_sessions (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references workspaces(id) on delete cascade,
  output_id         uuid not null references outputs(id) on delete cascade,
  parent_session_id uuid references visual_generation_sessions(id),
  version           integer not null default 1,
  is_active         boolean not null default true,
  aspect_ratio      text not null default 'landscape',
  quality           text not null default 'standard',
  visual_objective  text,
  audience_frame    text,
  emotional_tone    text,
  key_idea          text,
  generation_mode   text,
  created_at        timestamptz not null default now()
);
create index on visual_generation_sessions(output_id, is_active);
```

On each new generation: set `is_active = false` on all prior rows for that `output_id`, then insert a new row with `version = prior_max + 1` and `parent_session_id` pointing to the previous active row. This preserves full history for future rollback, comparison, and performance analysis without major architectural cost today.

localStorage (`clout:visuals-settings:{outputId}`) remains as a cache for instant pre-population before the DB fetch resolves. DB is canonical.

### Modified Files

- `app/(dashboard)/studio/[id]/page.tsx` — adds "Visuals" tab, mounts `<VisualsTab>` with `outputId`, `content`, `platform`, `lensId`
- `app/api/visual/generate/route.ts` — adds `visualObjective`, `audienceFrame`, `lensContext`; adds rate limiting
- `lib/visual/generation/generateImage.ts` — passes new fields into the VisualIntent compiler (Claude call)

---

## Visual Objective

Strategic framing that tells the system *why* the visual exists.

```ts
type VisualObjective =
  | 'authority'
  | 'education'
  | 'conversation'
  | 'engagement'
  | 'emotional_resonance'
  | 'lead_generation'
```

UI labels (segmented control, wraps to 2 rows at 320px):

| Value | Label |
|---|---|
| `authority` | Establish Authority |
| `education` | Educate |
| `conversation` | Drive Conversation |
| `engagement` | Increase Shares |
| `emotional_resonance` | Emotional Reaction |
| `lead_generation` | Generate Leads |

Sent to the VisualIntent compiler. Influences composition, symbolism, realism, typography tendency, emotional framing, and platform fit. Stored in `visual_generation_sessions`.

---

## Audience Frame

Who the visual is for. The single most important new field for strategic differentiation — without it, the system operates in an aesthetic vacuum.

An optional free-text input (with suggested values as chip-selects or autocomplete): Executives, Engineers, Investors, Consumers, Operators, Developers, Journalists, Creators, General Public.

| Audience | Likely visual influence |
|---|---|
| Investors | Restrained, institutional, credibility-first |
| Engineers | Structured, diagrammatic, precision composition |
| Consumers | Emotional, lifestyle-oriented, warm palette |
| Executives | Premium editorial, generous negative space |
| Creators | Culturally native, socially fluent composition |

This field materially influences: composition density, typography tendency, realism level, symbolism, color restraint, editorial tone, and perceived credibility — all via the VisualIntent compiler. Stored in `visual_generation_sessions`. Pre-populated from the session on return visits.

---

## Lens Integration

Visuals can optionally inherit context from the active lens for the post. Lenses carry tone profile, authority style, and audience intelligence — connecting the Visuals system to Clout's core intelligence layer.

When a post has an assigned lens, `VisualsTab` reads the lens context and passes it to the generate API as `lensContext`. The VisualIntent compiler uses it to influence:

| Lens type | Visual influence |
|---|---|
| Framework Lens | Cleaner, more conceptual, structured, sparse |
| Authority Lens | Restrained, editorial, institutional, credibility-first |
| Signal Lens | Culturally timely, faster visual pacing, socially native composition |

If no lens is assigned to the post, `lensContext` is omitted and the system operates on brand profile + explicit controls only. Lens integration is additive — it enhances without replacing the explicit controls.

This is where the long-term moat emerges: lens-aware visual continuity that carries the creator's positioning system into the visual layer.

---

## Panel Hierarchy

Mental model: editorial amplification, not configuration panel. Most users should rarely see aspect ratio or quality.

**Always visible:**
1. Generated visual (top, elevated)
2. Visual Context (collapsed disclosure, shown after first generation)
3. Directional refinement presets (shown after first generation)
4. Visual Objective (segmented control)
5. Audience Frame (text input with chip suggestions)
6. Emotional Tone (text input, optional)
7. Key Idea (text input, optional)

**Collapsed in "Visual Settings" accordion (bottom):**
- Aspect Ratio
- Quality
- Advanced: prompt override

**Primary CTA:** "Build visual direction" — always at the bottom.

```
┌──────────────────────────────┐
│  Preview  │  Visuals          │
├──────────────────────────────┤
│  [generated visual]          │  ← top, elevated
│  ▼ Visual Context            │  ← collapsed after gen
│  [More Editorial][Minimal]   │  ← refinement presets
│  [Emotional][Abstract]       │
│  [Technical][Branded]        │
│  [Social Native]   ↺ Rebuild │
├──────────────────────────────┤
│  Visual Objective            │
│  [Auth][Edu][Conv]           │
│  [Eng][Emo][Lead]            │
│                              │
│  Audience Frame              │
│  [Executives ▾]              │
│                              │
│  Emotional Tone (optional)   │
│  [________________________]  │
│                              │
│  Key Idea (optional)         │
│  [________________________]  │
│                              │
│  ▶ Visual Settings           │  ← collapsed accordion
│                              │
│  [Build visual direction   ] │
└──────────────────────────────┘
```

---

## Empty State

**Headline:** Shape how your ideas are perceived
**Subcopy:** Generate editorial visuals aligned to your content, audience, and brand positioning.
**CTA:** Build visual direction

No "AI image," "create artwork," or generic AI language.

---

## Directional Refinement Presets

Seven directional modifiers shown after a visual has been generated. Replace the undirected "⊕ Variation" button.

| Label | Modifier intent |
|---|---|
| More Editorial | Raise formality, asymmetric tension, reduce warmth |
| More Minimal | Increase negative space, reduce visual elements, flatten palette |
| More Emotional | Warmer color, softer light, more implied human presence |
| More Abstract | Move from literal toward texture / form / geometry |
| More Technical | Precision composition, cooler palette, structured grid |
| More Branded | Increase alignment to brand color and tone tokens |
| More Social Native | Improve focal clarity, pacing, contrast hierarchy, scroll interruption — **editorial interpretation only**: must not chase trend aesthetics, meme visuals, hyper-saturation, or virality optimization. Clout reads as culturally aware, not algorithmically desperate. |

Each preset appends a `variationReason` to the API call with `parentAssetId` set to the current asset. A plain **"Rebuild"** button re-runs generation from current controls without a parent asset.

---

## Loading State

- Keep prior image visible, apply blur + shimmer overlay during generation
- Animated status text: "Building visual direction…" (not "Generating…")
- No hard image swap until new asset URL is ready
- CTA becomes disabled with subtle progress indicator
- Empty state: show placeholder with shimmer (no blank space)

---

## Request Cancellation

`VisualsTab` holds an `AbortController` in a `useRef`. Each new generation call aborts the previous one and creates a new controller. Cleanup on unmount and on tab switch. Stale responses after abort are discarded.

```ts
const controllerRef = useRef<AbortController | null>(null)

function startGeneration() {
  controllerRef.current?.abort()
  controllerRef.current = new AbortController()
  fetch('/api/visual/generate', { signal: controllerRef.current.signal, ... })
}

useEffect(() => () => controllerRef.current?.abort(), [])
```

---

## Rate Limiting & Generation Accounting

**Server-side:**
- Max 1 generation per workspace per 10 seconds
- HD quality: max 5 per workspace per hour
- Every generation logged: `workspace_id`, `output_id`, `quality`, `mode`, `visual_objective`, `audience_frame`, timestamp

**Client-side:**
- CTA disabled for 3 seconds after each submission
- 429 response: "Give it a moment before building another direction." (muted, non-alarming)

**Future hooks:** generation credits, workspace quotas, billing linkage. Logging infrastructure in place from day one.

---

## Visual Context

Shown as a collapsed section after generation. Derives from the returned `visualIntent` object.

**Label:** Visual Context
**Content:** Human-readable summary, e.g.:

> "Editorial visual style with cinematic contrast, institutional authority cues, and restrained modern composition — warm gold accent against near-black. Composition: rule of thirds, generous negative space."

Constructed from: `visualIntent.compositionStyle`, `visualIntent.colorMood`, `visualIntent.lightingStyle`, brand archetype. **Raw OpenAI prompt is never exposed.** The prompt is implementation detail; the intent is the product.

---

## Settings Persistence

**Canonical:** `visual_generation_sessions` (versioned, append-only). Queried by `output_id` where `is_active = true`.
**Cache:** localStorage `clout:visuals-settings:{outputId}` — written on successful generation, read immediately on mount.

Fields persisted: `visualObjective`, `audienceFrame`, `emotionalTone`, `keyIdea`, `aspectRatio`, `quality`.

**On tab mount:**
1. Pre-populate from localStorage (instant)
2. `GET /api/visual/sessions?outputId={id}` — overwrite with DB-canonical values on resolve

---

## Data Flow

### On tab mount
1. Read localStorage → pre-populate controls
2. `GET /api/visual/assets?outputId={id}` → show most recent visual
3. `GET /api/visual/sessions?outputId={id}` → overwrite controls with DB session

### On "Build visual direction"
1. Abort any in-flight request; show blur/shimmer on current image
2. `POST /api/visual/generate` with: `outputId`, `content`, `platform`, `visualObjective`, `audienceFrame`, `emotionalTone`, `keyIdea`, `aspectRatio`, `quality`, `lensContext`, `[promptOverride]`
3. On success: display image, parse `visualIntent` for Visual Context, save settings to localStorage + `POST /api/visual/sessions`
4. On 422: "This direction was flagged. Try adjusting your description or objective." (amber)
5. On 500: "Something went wrong. Try again." (red + retry)
6. On abort: no state change

### On directional refinement
Same as generation with `parentAssetId` = current asset id and `variationReason` = preset modifier string. Settings not re-saved (presets are ephemeral).

---

## Error States

| Scenario | Message | Treatment |
|---|---|---|
| 422 content policy | "This direction was flagged. Try adjusting your description or objective." | Amber |
| 500 server error | "Something went wrong. Try again." | Red + retry |
| 429 rate limit | "Give it a moment before building another direction." | Muted gray |
| No channel assigned | Fallback to `'linkedin'` — silent, does not surface as error | Silent |

---

## Out of Scope

- **Publishing integration** — asset persisted with `output_id` but publishing flow does not yet read it; separate task.
- **Multi-asset picker / history UI** — only most recent shown; all assets persisted for future work.
- **Mobile** — right panel is `hidden lg:flex`; intentionally desktop-first.
- **Credits / billing** — logging in place from day one; billing linkage is future work.
- **Motion, carousels, quote cards** — naming and architecture is future-proofed; not in scope here.
- **Lens context implementation depth** — lens context is passed to the compiler as a hint; deep lens-visual integration is future work.
