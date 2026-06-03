# UTM Template Alternatives — Design Spec

**Date:** 2026-06-03
**Status:** Approved

## Overview

Extend the Attribution settings page (`/settings/utm`) to support template tokens for `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term`. Users can pick from predefined token options (e.g., campaign name, CTA text, lens, voice) that are resolved at publish time from the output's content context. Each token field includes a static fallback used when the token cannot be resolved.

## Data Model

### `UTMConfig` (per-platform, in `lib/distribution/platform-registry.ts`)

Add one optional field:

```ts
export type UTMConfig = {
  source: string
  medium: string
  mediumToken?: 'campaign_name' | 'topic' | null  // if set, used instead of medium at publish time; medium becomes fallback
  campaign?: string
  content?: string
  term?: string
}
```

### `UTMTemplateSettings` (global, new type in `lib/distribution/platform-registry.ts`)

```ts
export type UTMTemplateCampaignToken = 'auto' | 'campaign_name' | 'custom'
export type UTMTemplateContentToken  = 'auto' | 'cta' | 'custom'
export type UTMTemplateTermToken     = 'none' | 'lens' | 'voice' | 'custom'

export type UTMTemplateSettings = {
  campaign: { token: UTMTemplateCampaignToken; fallback: string }
  content:  { token: UTMTemplateContentToken;  fallback: string }
  term:     { token: UTMTemplateTermToken;      fallback: string }
}

export const DEFAULT_UTM_TEMPLATES: UTMTemplateSettings = {
  campaign: { token: 'auto', fallback: 'clout' },
  content:  { token: 'auto', fallback: 'post' },
  term:     { token: 'none', fallback: '' },
}
```

### Storage

Both per-platform settings and global templates are stored in the existing `workspace_distribution_settings.utm_settings` JSONB column. The templates live under a `_templates` key:

```json
{
  "linkedin": { "source": "linkedin", "medium": "social", "mediumToken": null },
  "newsletter": { "source": "newsletter", "medium": "email", "mediumToken": "campaign_name" },
  "_templates": {
    "campaign": { "token": "campaign_name", "fallback": "clout" },
    "content":  { "token": "cta",           "fallback": "read-more" },
    "term":     { "token": "none",          "fallback": "" }
  }
}
```

No DB migration required.

## UI — Two-Card Layout

### Card 1: Per-channel sources (existing table, medium upgraded)

Same table structure as today. The medium column becomes a two-part control:

- A `<select>` with options: `Social` (static display label for the stored value), `{campaign_name}`, `{topic}`, `Custom`
- A text input to the right:
  - When a token is selected → input is labeled "Fallback", slightly muted
  - When "Custom" is selected → normal plain-text input (existing behavior)

The "custom" badge still appears when either source or medium differs from the platform default. Reset row / reset all behavior unchanged.

### Card 2: Content templates (new section below Card 1)

Heading: "Content templates" with subtext explaining these values are resolved from the content at publish time.

Three rows, each with:
- Row label (utm_campaign / utm_content / utm_term)
- Token `<select>` picker
- Fallback text input (labeled "Fallback" or "Value" when token is `custom`)
- Live preview strip showing what the parameter will look like with example resolved values

Token picker options:

| Field | Options |
|---|---|
| utm_campaign | `Auto-ID` (current behavior), `Campaign name`, `Custom value` |
| utm_content | `Auto-ID` (current behavior), `CTA text`, `Custom value` |
| utm_term | `None` (omit), `Lens`, `Voice`, `Custom value` |

When token is `none`, the fallback input is hidden and the preview shows "(omitted)".
When token is `custom`, the fallback input is relabeled "Value" — it is the primary value.

### Shared save/reset bar

One Save / Reset all bar at the bottom handles both cards. Dirty-state tracking and validation cover both card 1 and card 2 settings.

## Token Resolution at Publish Time

### `buildUTMParams` signature change (`lib/analytics/utm.ts`)

```ts
export type UTMOutputContext = {
  campaignName?: string   // output.content.campaignName
  cta?: string            // output.content.ctaSuggestions?.[0]
  lensName?: string       // stored on output.content at generation time (not looked up at publish)
  voice?: string          // output.content.voiceRegister
  topic?: string          // output.content.topic if present
}

export function buildUTMParams(params: {
  platform: string
  canonicalId: string
  outputId: string
  customSources?: Record<string, UTMConfig>
  outputContext?: UTMOutputContext
  templates?: UTMTemplateSettings
}): UTMParams
```

### Resolution table

| Field | Token | Resolves to | Fallback when empty/missing |
|---|---|---|---|
| medium (per-platform) | `campaign_name` | `outputContext.campaignName` → normalized | static `medium` value |
| medium (per-platform) | `topic` | `outputContext.topic` → normalized | static `medium` value |
| utm_campaign | `auto` | `clout_c_{canonicalId.replace(/-/g,'').slice(0,12)}` | — |
| utm_campaign | `campaign_name` | `outputContext.campaignName` → normalized | `templates.campaign.fallback` |
| utm_campaign | `custom` | `templates.campaign.fallback` directly | — |
| utm_content | `auto` | `out_{outputId.replace(/-/g,'').slice(0,12)}` | — |
| utm_content | `cta` | `outputContext.cta` → normalized | `templates.content.fallback` |
| utm_content | `custom` | `templates.content.fallback` directly | — |
| utm_term | `none` | parameter omitted | — |
| utm_term | `lens` | `outputContext.lensName` → normalized | `templates.term.fallback` |
| utm_term | `voice` | `outputContext.voice` → normalized | `templates.term.fallback` |
| utm_term | `custom` | `templates.term.fallback` directly | — |

Normalization = `normalizeUTMValue()` (trim + lowercase). A token that resolves to an empty string after normalization also triggers the fallback.

`utm_term` is added to the `UTMParams` type as `utm_term?: string` and only included in the built params object when its resolved value is non-empty.

### Lens name storage

At generation time (`lib/linkedin/runGeneration.ts`), the resolved lens name(s) are stored on the output content JSON so no DB lookup is needed at publish time. The first lens name is used when the `lens` token is selected.

## Files Changed

| File | Change |
|---|---|
| `lib/distribution/platform-registry.ts` | Add `mediumToken` to `UTMConfig`; add `UTMTemplateSettings` type and `DEFAULT_UTM_TEMPLATES` constant |
| `lib/analytics/utm.ts` | Extend `buildUTMParams` with `outputContext` + `templates`; add resolution logic; add `utm_term` to `UTMParams` |
| `lib/domain/publishing-context.ts` | Load and return `_templates` from stored settings |
| `lib/domain/publishing.ts` | Pass `outputContext` (from `output.content`) when calling `buildUTMParams` |
| `lib/linkedin/runGeneration.ts` | Store `lensName` on output content at generation time |
| `app/api/workspace/utm/route.ts` | Validate and persist `_templates` alongside per-platform settings |
| `app/[workspaceSlug]/(dashboard)/settings/utm/page.tsx` | Two-card UI: upgraded medium column + new Content templates card |

## Validation Rules

**Per-platform (existing + new `mediumToken`):**
- `source`: required, `[a-z0-9_-]+`, max 50 chars (unchanged)
- `medium`: required when `mediumToken` is null/absent (static value); otherwise used as fallback — still required, same pattern
- `mediumToken`: must be one of `'campaign_name' | 'topic'` or null/absent

**Global templates:**
- `campaign.token`: must be a valid `UTMTemplateCampaignToken`
- `campaign.fallback`: required when token is not `auto`, same `[a-z0-9_-]+` pattern, max 50 chars
- `content.token`: must be a valid `UTMTemplateContentToken`
- `content.fallback`: required when token is not `auto`, same pattern
- `term.token`: must be a valid `UTMTemplateTermToken`
- `term.fallback`: required when token is `lens`, `voice`, or `custom`; empty string allowed when token is `none`

## Out of Scope

- Template tokens for `utm_source` (stays per-platform plain text)
- Per-platform campaign/content/term overrides (global templates only)
- Token preview using real content data in the settings UI (preview uses placeholder example text)
