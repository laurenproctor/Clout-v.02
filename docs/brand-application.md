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
| Blog article phases | `/api/blog/generate-article`, `/generate-social`, `/regenerate-section` | ⏳ follow-up (same 3 edits) |
| Substack | `/api/substack/generate` | ⏳ follow-up |
| Draft | `/api/draft/generate`, `/competitor-intel` | ◑ partial (competitor-intel uses `getBrandContext`) |
| Syndication | `/api/syndication/generate` | n/a — publishing adapters, not voice generation |
| Substack Email | — | n/a — no generation step |

## Adding a new generator

1. Decide which surface(s) apply: editorial voice, visual identity, or both.
2. Voice → load `getBrandContext()` in the route and `lines.push(...buildBrandVoicePromptBlock(ctx.brandContext))`
   in the system-prompt builder, **before** the output schema.
3. Visual → load `loadGenerationBrandProfile()` and follow the image precedence above.
4. Add a row to the inventory table.

**Known follow-ups:** per-level `typography_settings` (h1–h6) is saved but only used in previews,
not in image rendering; and a future `GeneratorBrandCapabilities` contract would make each
generator declare its brand relationship explicitly.
