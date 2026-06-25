# Brand application across generators

How workspace **Brand Settings** flow into generated content, and the rules every generator
must follow so the next one doesn't silently skip brand.

## Precedence model (do not break this)

Brand is one layer in a fixed precedence order — higher always wins:

```
Explicit generation input / selected-template override
  > Workspace Brand Settings
  > Generator defaults
  > System fallback
```

Concretely for **image rendering** (`lib/visual/generation/generateImage.ts`):

```
overlayParams colors/fonts (user color-scheme override)
  > brandProfile identity values
  > template defaults
  > system-ui / default palette
```

This is why the overlay render path keeps fonts/colors sourced from `overlayParams` and only
swaps in the brand profile's *semantic / style traits* (e.g. `border_radius`).

## Two brand surfaces, two helpers

| Surface | Helper | Carries |
|---|---|---|
| Visual identity | `lib/visual/brand/loadGenerationBrandProfile.ts` | fonts (+ custom URLs), colors, style traits, imagery semantics |
| Editorial voice | `lib/brand/getBrandContext.ts` | tone traits, generation notes, negative rules (+ visual fields) |

Text generators render the voice via the shared `lib/brand/buildBrandVoicePromptBlock.ts`
(`## Workspace Brand Voice`: Tone / Notes / Avoid). The helper:

- computes "is there anything to show" **after** normalization (blank/whitespace → empty block);
- **caps** fields in both dimensions (≤12 tone traits; ≤20 negative rules; notes ≤1200 chars;
  each rule ≤180 chars) so Brand Settings can't become an unbounded second prompt surface;
- always appends a **guard line** — the block sits before the JSON output schema and the fields
  are user free text, so they "guide style only" and must not override format/factuality/platform rules.

## Font diagnostics

Composited images record per-font diagnostics on the asset (`generation_context.brandFontDiagnostics`,
typed in `lib/brand/types.ts`) so "why isn't my brand font applied?" is answerable without re-running.
`source` ∈ `custom_url | google | generic | system | unresolved | none`. A configured non-generic
font that resolves to no URL logs a `[visual/fonts] brand font did not resolve` warning and records
`source: 'unresolved'`, `fallbackUsed: true`. Back-compat booleans: `brandFontsApplied` (typography
reached the renderer, incl. generic families) and `brandDownloadableFontsResolved` (a custom/Google
file actually loaded).

## Generator inventory

| Generator | Route | Brand status |
|---|---|---|
| Image | `/api/visual/generate` | ✅ visual identity (fonts/colors/traits) + diagnostics |
| Instagram | `/api/instagram/generate` | ✅ rich voice (tone + visual) + guard line |
| Threads | `/api/threads/generate` | ✅ voice via shared helper |
| LinkedIn | `/api/linkedin/generate` | ✅ voice via shared helper |
| Note | `/api/note/generate` | ✅ voice via shared helper |
| Blog (Phase 1–3) | `/api/blog/generate` | ✅ voice via shared helper (covers narrative + hook phases) |
| Blog article phases | `/api/blog/generate-article`, `/generate-social`, `/regenerate-section` | ✅ voice via `BlogPromptContext.brandContext` (flows through `buildBlogSystemPrompt`) |
| Substack | `/api/substack/generate` | ✅ voice via shared helper |
| Draft | `/api/draft/generate`, `/competitor-intel` | ✅ voice via shared helper (appended to the OpenAI system prompt; `PROMPT_VERSION` bumped to invalidate cache) |
| Syndication | `/api/syndication/generate` | n/a — publishing adapters, not voice generation |
| Substack Email | — | n/a — no generation step |

## Adding a new generator

1. Decide which surface(s) apply: editorial voice, visual identity, or both.
2. Voice → load `getBrandContext()` in the route and `lines.push(...buildBrandVoicePromptBlock(ctx.brandContext))`
   in the system-prompt builder, **before** the output schema.
3. Visual → load `loadGenerationBrandProfile()` and follow the image precedence above.
4. Add a row to the inventory table.
5. Declare the generator's brand surfaces in `lib/brand/generatorCapabilities.ts` (the test fails
   until you do) — this keeps brand application explicit rather than implicit.

## Brand capabilities registry

`lib/brand/generatorCapabilities.ts` is the source of truth for which brand surfaces each
generator consumes (voice / identity / imagery / custom fonts / diagnostics). A test guards its
invariants. Use it to audit coverage and to catch a new generator that forgot to wire brand.

## Known follow-up: `typography_settings` (deferred — needs a design decision + visual review)

Per-level `typography_settings` (h1–h6/body/ui: weight, line-height, letter-spacing, transform,
color, size) is saved and used in brand *previews*, but **not** in image rendering. Wiring it into
the Satori/Puppeteer templates was attempted and deferred because it needs decisions this layer
can't make safely on its own:

- **It's populated with defaults for every workspace**, so applying it unconditionally would
  change the typography of *every* generated image — there's no "user customized this" signal to
  distinguish an intentional override from an untouched default.
- **Templates own responsive sizing** (`fitHeadlineSize`, tuned line-height/letter-spacing per
  element) to prevent overflow; brand fixed sizes would fight that. Any wiring should apply only
  non-size attributes and map template elements → levels (headline→h1, subtext→body, credit→ui).
- **Two `textTransform` values** (`sentence-case`, `title-case`) have no pure-CSS equivalent.
- **It can't be verified locally** — the renderer uses serverless Chromium (`@sparticuz/chromium`)
  which won't launch on local macOS, so any change must be reviewed in a preview deploy.

Recommended approach when picked up: add a "typography customized" flag (or diff against the
seeded defaults) so only intentional overrides apply; wire non-size attributes through
`BrandTokens` to the Puppeteer templates via a shared CSS helper; verify in a preview deploy.
