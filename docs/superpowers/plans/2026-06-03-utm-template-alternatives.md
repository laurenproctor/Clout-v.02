# UTM Template Alternatives Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Attribution settings page to support template tokens for utm_medium (per-platform), and add global workspace-level templates for utm_campaign, utm_content, and utm_term — resolved at publish time from the output's content context (campaignName, CTA, lens, voice).

**Architecture:** Two-section settings UI — existing per-platform table with upgraded medium column, plus a new global Content Templates card. Token settings stored under `_templates` key in the existing `utm_settings` JSONB column. Resolution logic lives in `buildUTMParams`, which receives `outputContext` built from fields stored on `output.content` at save time.

**Tech Stack:** Next.js App Router, TypeScript, Supabase (JSONB column, no migration), Vitest, Tailwind CSS

---

## File Map

| File | Change |
|---|---|
| `lib/distribution/platform-registry.ts` | Add `mediumToken` to `UTMConfig`; add `UTMTemplateSettings` type + `DEFAULT_UTM_TEMPLATES` |
| `lib/analytics/utm.ts` | Add `UTMOutputContext` type; add `utm_term` to `UTMParams`; extend `buildUTMParams` with token resolution |
| `lib/domain/publishing-context.ts` | Load and return `_templates` from utm_settings JSONB |
| `lib/domain/publishing.ts` | Build `outputContext` from `output.content` and pass to `buildUTMParams` |
| `components/linkedin/LinkedInWorkspace.tsx` | Include `campaignName`, `cta`, `voiceRegister`, `lensName` in the auto-save payload |
| `app/api/linkedin/outputs/route.ts` | Accept and store the new UTM context fields in `output.content` |
| `app/api/workspace/utm/route.ts` | Validate and persist `_templates`; return it in GET response |
| `app/[workspaceSlug]/(dashboard)/settings/utm/page.tsx` | Two-card UI with upgraded medium + new Content Templates card |
| `tests/utm/buildUTMParams.test.ts` | Unit tests for token resolution in `buildUTMParams` |

---

### Task 1: Extend types in platform-registry.ts

**Files:**
- Modify: `lib/distribution/platform-registry.ts`

- [ ] **Step 1: Add `mediumToken` to `UTMConfig` and add `UTMTemplateSettings` type**

Replace the entire file content:

```ts
export type UTMConfig = {
  source: string
  medium: string
  mediumToken?: 'campaign_name' | 'topic' | null
  campaign?: string
  content?: string
  term?: string
}

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
  content:  { token: 'auto', fallback: 'post'  },
  term:     { token: 'none', fallback: ''       },
}

export type PlatformEntry = {
  label: string
  defaultUTM: UTMConfig
}

export const DISTRIBUTION_PLATFORMS: Record<string, PlatformEntry> = {
  linkedin:                { label: 'LinkedIn',                defaultUTM: { source: 'linkedin',        medium: 'social'     } },
  x:                       { label: 'X (Twitter)',             defaultUTM: { source: 'x',               medium: 'social'     } },
  threads:                 { label: 'Threads',                 defaultUTM: { source: 'threads',         medium: 'social'     } },
  facebook:                { label: 'Facebook',                defaultUTM: { source: 'facebook',        medium: 'social'     } },
  instagram:               { label: 'Instagram',               defaultUTM: { source: 'instagram',       medium: 'social'     } },
  tiktok:                  { label: 'TikTok',                  defaultUTM: { source: 'tiktok',          medium: 'social'     } },
  newsletter:              { label: 'Newsletter',              defaultUTM: { source: 'newsletter',      medium: 'email'      } },
  wordpress:               { label: 'WordPress',               defaultUTM: { source: 'blog',            medium: 'organic'    } },
  medium:                  { label: 'Medium',                  defaultUTM: { source: 'medium',          medium: 'content'    } },
  shopify:                 { label: 'Shopify',                 defaultUTM: { source: 'shopify',         medium: 'ecommerce'  } },
  substack:                { label: 'Substack',                defaultUTM: { source: 'substack',        medium: 'email'      } },
  google_business_profile: { label: 'Google Business Profile', defaultUTM: { source: 'google_business', medium: 'local'      } },
} as const

export function getPlatformDefault(platform: string): UTMConfig {
  return DISTRIBUTION_PLATFORMS[platform]?.defaultUTM ?? { source: platform, medium: 'content' }
}

export function normalizeUTMValue(value: string): string {
  return value.trim().toLowerCase()
}

export const PLATFORM_KEYS = Object.keys(DISTRIBUTION_PLATFORMS)
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "platform-registry" | head -10`
Expected: no output (no errors in this file)

- [ ] **Step 3: Commit**

```bash
git add lib/distribution/platform-registry.ts
git commit -m "feat: add mediumToken to UTMConfig and UTMTemplateSettings type"
```

---

### Task 2: Extend buildUTMParams with token resolution

**Files:**
- Modify: `lib/analytics/utm.ts`
- Create: `tests/utm/buildUTMParams.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/utm/buildUTMParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildUTMParams } from '@/lib/analytics/utm'
import type { UTMTemplateSettings } from '@/lib/distribution/platform-registry'

const BASE = {
  platform: 'linkedin',
  canonicalId: 'aaaabbbbccccdddd',
  outputId:    'eeeeffffgggghhhh',
  customSources: {
    linkedin: { source: 'linkedin', medium: 'social' },
  },
}

const TEMPLATES: UTMTemplateSettings = {
  campaign: { token: 'auto',    fallback: 'clout'     },
  content:  { token: 'auto',    fallback: 'post'      },
  term:     { token: 'none',    fallback: ''          },
}

describe('buildUTMParams — auto tokens (current behaviour)', () => {
  it('produces auto-ID campaign and content when tokens are auto', () => {
    const p = buildUTMParams({ ...BASE, templates: TEMPLATES })
    expect(p.utm_campaign).toBe('clout_c_aaaabbbbcccc')
    expect(p.utm_content).toBe('out_eeeeffffgggg')
    expect(p.utm_term).toBeUndefined()
  })
})

describe('buildUTMParams — campaign_name token', () => {
  it('uses campaignName when available', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: 'My Big Launch' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('my-big-launch')
  })

  it('normalizes campaignName (lowercase, spaces → hyphens)', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: 'Hello World' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('hello-world')
  })

  it('falls back when campaignName is empty', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { campaignName: '' },
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('clout')
  })

  it('falls back when outputContext is absent', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, campaign: { token: 'campaign_name', fallback: 'clout' } },
    })
    expect(p.utm_campaign).toBe('clout')
  })
})

describe('buildUTMParams — custom campaign token', () => {
  it('uses fallback string directly', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, campaign: { token: 'custom', fallback: 'q1-push' } },
    })
    expect(p.utm_campaign).toBe('q1-push')
  })
})

describe('buildUTMParams — cta token for content', () => {
  it('uses first CTA suggestion', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { cta: 'Book a demo' },
      templates: { ...TEMPLATES, content: { token: 'cta', fallback: 'read-more' } },
    })
    expect(p.utm_content).toBe('book-a-demo')
  })

  it('falls back when cta is empty', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { cta: '' },
      templates: { ...TEMPLATES, content: { token: 'cta', fallback: 'read-more' } },
    })
    expect(p.utm_content).toBe('read-more')
  })
})

describe('buildUTMParams — term tokens', () => {
  it('omits utm_term when token is none', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'none', fallback: '' } },
    })
    expect(p.utm_term).toBeUndefined()
  })

  it('uses lens name when available', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { lensName: 'Framework Lens' },
      templates: { ...TEMPLATES, term: { token: 'lens', fallback: 'no-lens' } },
    })
    expect(p.utm_term).toBe('framework-lens')
  })

  it('falls back when lensName missing', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'lens', fallback: 'no-lens' } },
    })
    expect(p.utm_term).toBe('no-lens')
  })

  it('uses voice register', () => {
    const p = buildUTMParams({
      ...BASE,
      outputContext: { voice: 'executive' },
      templates: { ...TEMPLATES, term: { token: 'voice', fallback: 'standard' } },
    })
    expect(p.utm_term).toBe('executive')
  })

  it('uses custom term value', () => {
    const p = buildUTMParams({
      ...BASE,
      templates: { ...TEMPLATES, term: { token: 'custom', fallback: 'q1' } },
    })
    expect(p.utm_term).toBe('q1')
  })
})

describe('buildUTMParams — medium token (per-platform)', () => {
  it('uses static medium when no mediumToken set', () => {
    const p = buildUTMParams({ ...BASE, templates: TEMPLATES })
    expect(p.utm_medium).toBe('social')
  })

  it('uses campaign_name token for medium', () => {
    const p = buildUTMParams({
      ...BASE,
      customSources: { linkedin: { source: 'linkedin', medium: 'social', mediumToken: 'campaign_name' } },
      outputContext: { campaignName: 'Product Launch' },
      templates: TEMPLATES,
    })
    expect(p.utm_medium).toBe('product-launch')
  })

  it('falls back to static medium when campaign_name token has no value', () => {
    const p = buildUTMParams({
      ...BASE,
      customSources: { linkedin: { source: 'linkedin', medium: 'social', mediumToken: 'campaign_name' } },
      templates: TEMPLATES,
    })
    expect(p.utm_medium).toBe('social')
  })
})

describe('buildUTMParams — no templates provided', () => {
  it('preserves existing auto-ID behaviour', () => {
    const p = buildUTMParams(BASE)
    expect(p.utm_campaign).toBe('clout_c_aaaabbbbcccc')
    expect(p.utm_content).toBe('out_eeeeffffgggg')
    expect(p.utm_term).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npx vitest run tests/utm/buildUTMParams.test.ts 2>&1 | tail -20`
Expected: FAIL — `buildUTMParams` doesn't accept `templates` or `outputContext` yet.

- [ ] **Step 3: Rewrite `lib/analytics/utm.ts`**

```ts
import {
  getPlatformDefault,
  UTMConfig,
  UTMTemplateSettings,
  normalizeUTMValue,
} from '@/lib/distribution/platform-registry'

export type { UTMConfig }

export interface UTMParams {
  utm_source:   string
  utm_medium:   string
  utm_campaign: string
  utm_content?: string
  utm_term?:    string
}

export interface UTMOutputContext {
  campaignName?: string
  cta?:          string
  lensName?:     string
  voice?:        string
  topic?:        string
}

// Normalizes a token value: trim + lowercase + replace spaces with hyphens.
// Returns empty string if the result is empty (triggers fallback).
function normalizeToken(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9_-]/g, '')
}

export function buildUTMParams(params: {
  platform:       string
  canonicalId:    string
  outputId:       string
  customSources?: Record<string, UTMConfig>
  outputContext?: UTMOutputContext
  templates?:     UTMTemplateSettings
}): UTMParams {
  const { platform, canonicalId, outputId, customSources, outputContext, templates } = params
  const platformCfg = customSources?.[platform] ?? getPlatformDefault(platform)

  // ── utm_source ────────────────────────────────────────────────────────────
  const utm_source = platformCfg.source

  // ── utm_medium ────────────────────────────────────────────────────────────
  let utm_medium = platformCfg.medium
  if (platformCfg.mediumToken === 'campaign_name') {
    const resolved = normalizeToken(outputContext?.campaignName)
    if (resolved) utm_medium = resolved
  } else if (platformCfg.mediumToken === 'topic') {
    const resolved = normalizeToken(outputContext?.topic)
    if (resolved) utm_medium = resolved
  }

  // ── utm_campaign ──────────────────────────────────────────────────────────
  let utm_campaign: string
  if (!templates || templates.campaign.token === 'auto') {
    utm_campaign = `clout_c_${canonicalId.replace(/-/g, '').slice(0, 12)}`
  } else if (templates.campaign.token === 'campaign_name') {
    const resolved = normalizeToken(outputContext?.campaignName)
    utm_campaign = resolved || templates.campaign.fallback
  } else {
    // custom
    utm_campaign = templates.campaign.fallback
  }

  // ── utm_content ───────────────────────────────────────────────────────────
  let utm_content: string | undefined
  if (!templates || templates.content.token === 'auto') {
    utm_content = `out_${outputId.replace(/-/g, '').slice(0, 12)}`
  } else if (templates.content.token === 'cta') {
    const resolved = normalizeToken(outputContext?.cta)
    utm_content = resolved || templates.content.fallback || undefined
  } else {
    // custom
    utm_content = templates.content.fallback || undefined
  }

  // ── utm_term ──────────────────────────────────────────────────────────────
  let utm_term: string | undefined
  if (templates && templates.term.token !== 'none') {
    if (templates.term.token === 'lens') {
      const resolved = normalizeToken(outputContext?.lensName)
      utm_term = resolved || templates.term.fallback || undefined
    } else if (templates.term.token === 'voice') {
      const resolved = normalizeToken(outputContext?.voice)
      utm_term = resolved || templates.term.fallback || undefined
    } else {
      // custom
      utm_term = templates.term.fallback || undefined
    }
  }

  return { utm_source, utm_medium, utm_campaign, utm_content, utm_term }
}

export function appendUTMToUrl(baseUrl: string, utmParams: UTMParams): string {
  try {
    const url = new URL(baseUrl)
    url.searchParams.set('utm_source',   utmParams.utm_source)
    url.searchParams.set('utm_medium',   utmParams.utm_medium)
    url.searchParams.set('utm_campaign', utmParams.utm_campaign)
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content)
    if (utmParams.utm_term)    url.searchParams.set('utm_term',    utmParams.utm_term)
    return url.toString()
  } catch {
    return baseUrl
  }
}

const SKIP_UTM_HOSTNAMES = new Set([
  'linkedin.com', 'twitter.com', 'x.com', 'threads.net', 'facebook.com',
  'instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be', 't.co',
  'medium.com', 'substack.com', 'wordpress.com', 'shopify.com',
])

function shouldTagUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.replace(/^www\./, '')
    return !SKIP_UTM_HOSTNAMES.has(hostname)
  } catch {
    return false
  }
}

export function injectUTMIntoContent(body: string, utmParams: UTMParams): string {
  return body.replace(/https?:\/\/[^\s<>"')\]]+/g, (url) => {
    if (!shouldTagUrl(url)) return url
    return appendUTMToUrl(url, utmParams)
  })
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npx vitest run tests/utm/buildUTMParams.test.ts 2>&1 | tail -20`
Expected: all tests PASS

- [ ] **Step 5: Verify no TypeScript errors**

Run: `npx tsc --noEmit 2>&1 | grep "utm" | head -20`
Expected: no output

- [ ] **Step 6: Commit**

```bash
git add lib/analytics/utm.ts tests/utm/buildUTMParams.test.ts
git commit -m "feat: extend buildUTMParams with token resolution for medium/campaign/content/term"
```

---

### Task 3: publishing-context.ts — return templates

**Files:**
- Modify: `lib/domain/publishing-context.ts`

- [ ] **Step 1: Update `WorkspacePublishingContext` to include templates and load them from DB**

Replace the entire file:

```ts
import { createServiceClient } from '@/lib/supabase/service'
import { UTMConfig, UTMTemplateSettings, DEFAULT_UTM_TEMPLATES } from '@/lib/distribution/platform-registry'

type WorkspacePublishingContext = {
  utmSettings:  Record<string, UTMConfig>
  utmTemplates: UTMTemplateSettings
}

const contextCache = new Map<string, WorkspacePublishingContext>()

export async function buildWorkspacePublishingContext(
  workspaceId: string
): Promise<WorkspacePublishingContext> {
  if (contextCache.has(workspaceId)) return contextCache.get(workspaceId)!

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspace_distribution_settings')
    .select('utm_settings')
    .eq('workspace_id', workspaceId)
    .single()

  const raw = (data?.utm_settings ?? {}) as Record<string, unknown>
  const { _templates, ...platformSettings } = raw

  const ctx: WorkspacePublishingContext = {
    utmSettings:  platformSettings as Record<string, UTMConfig>,
    utmTemplates: (_templates as UTMTemplateSettings | undefined) ?? DEFAULT_UTM_TEMPLATES,
  }
  contextCache.set(workspaceId, ctx)
  return ctx
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "publishing-context" | head -10`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add lib/domain/publishing-context.ts
git commit -m "feat: load utm templates from publishing context"
```

---

### Task 4: publishing.ts — pass outputContext to buildUTMParams

**Files:**
- Modify: `lib/domain/publishing.ts`

- [ ] **Step 1: Find the `buildUTMParams` call and update it**

In `lib/domain/publishing.ts`, find this block (around lines 533–543):

```ts
  const utmParams = buildUTMParams({
    platform: channel.platform,
    canonicalId,
    outputId: output.id,
    customSources: publishingCtx.utmSettings,
  })
```

Replace it with:

```ts
  const outputContent = output.content as Record<string, unknown>
  const utmParams = buildUTMParams({
    platform:      channel.platform,
    canonicalId,
    outputId:      output.id,
    customSources: publishingCtx.utmSettings,
    templates:     publishingCtx.utmTemplates,
    outputContext: {
      campaignName: outputContent.campaignName as string | undefined,
      cta:          outputContent.cta          as string | undefined,
      lensName:     outputContent.lensName     as string | undefined,
      voice:        outputContent.voiceRegister as string | undefined,
      topic:        outputContent.topic         as string | undefined,
    },
  })
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "publishing" | head -10`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add lib/domain/publishing.ts
git commit -m "feat: pass outputContext and templates to buildUTMParams at publish time"
```

---

### Task 5: Store UTM context fields at output save time

**Files:**
- Modify: `components/linkedin/LinkedInWorkspace.tsx`
- Modify: `app/api/linkedin/outputs/route.ts`

- [ ] **Step 1: Update the auto-save payload in `LinkedInWorkspace.tsx`**

Find the auto-save block (around line 111–124). The component has `lenses: Lens[]` as a prop and `request` state that contains `voiceRegister` and `lensIds`.

Replace the `fetch` call body:

```ts
// Before — only sends body + hashtags
body: JSON.stringify({
  variation: { body: v.body, hashtags: v.hashtags },
  title: v.campaignName,
  channelId: channelId ?? null,
}),
```

With:

```ts
// After — includes UTM context fields for token resolution at publish time
const firstLensName = lenses.find(l => request.lensIds?.[0] === l.id)?.name ?? null
body: JSON.stringify({
  variation: {
    body:         v.body,
    hashtags:     v.hashtags,
    campaignName: v.campaignName,
    cta:          v.ctaSuggestions?.[0] ?? null,
    voiceRegister: request.voiceRegister ?? null,
    lensName:     firstLensName,
  },
  title:     v.campaignName,
  channelId: channelId ?? null,
}),
```

- [ ] **Step 2: Update the API route schema and storage in `app/api/linkedin/outputs/route.ts`**

Replace the entire file:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  variation: z.object({
    body:                 z.string().min(1),
    hashtags:             z.array(z.string()).optional(),
    primaryVisualAssetId: z.string().uuid().nullable().optional(),
    campaignName:         z.string().nullable().optional(),
    cta:                  z.string().nullable().optional(),
    voiceRegister:        z.string().nullable().optional(),
    lensName:             z.string().nullable().optional(),
  }),
  title:     z.string().optional(),
  channelId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { variation, title, channelId } = parsed.data
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id:  session.workspaceId,
      status:        'draft',
      content_type:  'linkedin',
      title:         title ?? null,
      content: {
        body:                 variation.body,
        hashtags:             variation.hashtags ?? [],
        primaryVisualAssetId: variation.primaryVisualAssetId ?? null,
        campaignName:         variation.campaignName ?? null,
        cta:                  variation.cta ?? null,
        voiceRegister:        variation.voiceRegister ?? null,
        lensName:             variation.lensName ?? null,
      },
      channel_id:    channelId ?? null,
      created_at:    now,
      updated_at:    now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep -E "LinkedInWorkspace|outputs/route" | head -10`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add components/linkedin/LinkedInWorkspace.tsx app/api/linkedin/outputs/route.ts
git commit -m "feat: store campaignName, cta, voiceRegister, lensName on output content at save time"
```

---

### Task 6: API route — validate and persist utm templates

**Files:**
- Modify: `app/api/workspace/utm/route.ts`

- [ ] **Step 1: Replace the entire route with template support**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import {
  DISTRIBUTION_PLATFORMS,
  PLATFORM_KEYS,
  getPlatformDefault,
  normalizeUTMValue,
  UTMConfig,
  UTMTemplateSettings,
  DEFAULT_UTM_TEMPLATES,
  UTMTemplateCampaignToken,
  UTMTemplateContentToken,
  UTMTemplateTermToken,
} from '@/lib/distribution/platform-registry'

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/
const CAMPAIGN_TOKENS:  UTMTemplateCampaignToken[] = ['auto', 'campaign_name', 'custom']
const CONTENT_TOKENS:   UTMTemplateContentToken[]  = ['auto', 'cta', 'custom']
const TERM_TOKENS:      UTMTemplateTermToken[]      = ['none', 'lens', 'voice', 'custom']

function validateUTMValue(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return `${field} is required`
  if (value.length > 50) return `${field} must be 50 characters or fewer`
  if (!UTM_VALUE_PATTERN.test(value)) return `${field} must be lowercase alphanumeric with hyphens or underscores only`
  return null
}

function validateFallback(value: unknown, field: string, required: boolean): string | null {
  if (!required) {
    if (typeof value !== 'string') return null
    if (value === '') return null
    return validateUTMValue(value, field)
  }
  return validateUTMValue(value, field)
}

function validateTemplates(raw: unknown): { error: string } | { templates: UTMTemplateSettings } {
  if (typeof raw !== 'object' || raw === null) return { error: 'Invalid _templates object' }
  const t = raw as Record<string, unknown>

  // campaign
  const camp = t.campaign as Record<string, unknown> | undefined
  if (!camp) return { error: '_templates.campaign is required' }
  if (!CAMPAIGN_TOKENS.includes(camp.token as UTMTemplateCampaignToken)) {
    return { error: `_templates.campaign.token must be one of: ${CAMPAIGN_TOKENS.join(', ')}` }
  }
  const campFallbackRequired = camp.token !== 'auto'
  const campErr = validateFallback(camp.fallback, '_templates.campaign.fallback', campFallbackRequired)
  if (campErr) return { error: campErr }

  // content
  const cont = t.content as Record<string, unknown> | undefined
  if (!cont) return { error: '_templates.content is required' }
  if (!CONTENT_TOKENS.includes(cont.token as UTMTemplateContentToken)) {
    return { error: `_templates.content.token must be one of: ${CONTENT_TOKENS.join(', ')}` }
  }
  const contFallbackRequired = cont.token !== 'auto'
  const contErr = validateFallback(cont.fallback, '_templates.content.fallback', contFallbackRequired)
  if (contErr) return { error: contErr }

  // term
  const term = t.term as Record<string, unknown> | undefined
  if (!term) return { error: '_templates.term is required' }
  if (!TERM_TOKENS.includes(term.token as UTMTemplateTermToken)) {
    return { error: `_templates.term.token must be one of: ${TERM_TOKENS.join(', ')}` }
  }
  const termFallbackRequired = ['lens', 'voice', 'custom'].includes(term.token as string)
  const termErr = validateFallback(term.fallback, '_templates.term.fallback', termFallbackRequired)
  if (termErr) return { error: termErr }

  return {
    templates: {
      campaign: {
        token:    camp.token    as UTMTemplateCampaignToken,
        fallback: (camp.fallback as string) ?? '',
      },
      content: {
        token:    cont.token    as UTMTemplateContentToken,
        fallback: (cont.fallback as string) ?? '',
      },
      term: {
        token:    term.token    as UTMTemplateTermToken,
        fallback: (term.fallback as string) ?? '',
      },
    },
  }
}

function validateSettings(body: unknown): { error: string } | { settings: Record<string, UTMConfig>; templates: UTMTemplateSettings } {
  if (typeof body !== 'object' || body === null) return { error: 'Invalid request body' }
  const input = body as Record<string, unknown>

  const settings: Record<string, UTMConfig> = {}
  for (const key of PLATFORM_KEYS) {
    const entry = input[key]
    if (typeof entry !== 'object' || entry === null) return { error: `Missing platform: ${key}` }
    const e = entry as Record<string, unknown>

    const sourceErr = validateUTMValue(e.source, `${key}.source`)
    if (sourceErr) return { error: sourceErr }
    const mediumErr = validateUTMValue(e.medium, `${key}.medium`)
    if (mediumErr) return { error: mediumErr }

    if (e.mediumToken !== undefined && e.mediumToken !== null) {
      if (!['campaign_name', 'topic'].includes(e.mediumToken as string)) {
        return { error: `${key}.mediumToken must be 'campaign_name', 'topic', or null` }
      }
    }

    settings[key] = {
      source:      normalizeUTMValue(e.source as string),
      medium:      normalizeUTMValue(e.medium as string),
      mediumToken: (e.mediumToken as 'campaign_name' | 'topic' | null | undefined) ?? null,
    }
  }

  // Reject unknown platform keys (allow _templates)
  for (const key of Object.keys(input)) {
    if (key === '_templates') continue
    if (!DISTRIBUTION_PLATFORMS[key]) return { error: `Unknown platform: ${key}` }
  }

  // Validate templates (required in PATCH)
  if (!input._templates) return { error: '_templates is required' }
  const templateResult = validateTemplates(input._templates)
  if ('error' in templateResult) return templateResult

  return { settings, templates: templateResult.templates }
}

async function requireAdminSession() {
  const session = await getSession()
  if (!session) return { error: 'Unauthorized', status: 401 } as const

  const supabase = createServiceClient()
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', session.workspaceId)
    .eq('user_id', session.userId)
    .single()

  if (!member || !['owner', 'admin'].includes(member.role as string)) {
    return { error: 'Forbidden', status: 403 } as const
  }

  return { session, supabase }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data } = await supabase
    .from('workspace_distribution_settings')
    .select('utm_settings')
    .eq('workspace_id', session.workspaceId)
    .single()

  const raw = (data?.utm_settings ?? {}) as Record<string, unknown>
  const { _templates: storedTemplates, ...storedPlatforms } = raw
  const stored = storedPlatforms as Record<string, Partial<UTMConfig>>

  // Merge stored per-platform overrides with canonical defaults
  const merged: Record<string, UTMConfig> = {}
  for (const key of PLATFORM_KEYS) {
    const defaults = getPlatformDefault(key)
    const override = stored[key]
    merged[key] = {
      source:      override?.source      ?? defaults.source,
      medium:      override?.medium      ?? defaults.medium,
      mediumToken: override?.mediumToken ?? null,
    }
  }

  return NextResponse.json({
    ...merged,
    _templates: (storedTemplates as UTMTemplateSettings | undefined) ?? DEFAULT_UTM_TEMPLATES,
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession()
  if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { session, supabase } = auth

  const body = await req.json()
  const result = validateSettings(body)
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

  const { error } = await supabase
    .from('workspace_distribution_settings')
    .upsert({
      workspace_id: session.workspaceId,
      utm_settings: { ...result.settings, _templates: result.templates },
      updated_by:   session.userId,
    })
    .eq('workspace_id', session.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ...result.settings, _templates: result.templates })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "workspace/utm" | head -10`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add app/api/workspace/utm/route.ts
git commit -m "feat: validate and persist utm_templates in settings API"
```

---

### Task 7: Settings UI — two-card layout

**Files:**
- Modify: `app/[workspaceSlug]/(dashboard)/settings/utm/page.tsx`

- [ ] **Step 1: Replace the entire page with the two-card implementation**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { Loader2, Save, Check, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DISTRIBUTION_PLATFORMS,
  PLATFORM_KEYS,
  getPlatformDefault,
  normalizeUTMValue,
  DEFAULT_UTM_TEMPLATES,
  UTMTemplateSettings,
  UTMTemplateCampaignToken,
  UTMTemplateContentToken,
  UTMTemplateTermToken,
} from '@/lib/distribution/platform-registry'

type PlatformUTM = { source: string; medium: string; mediumToken: 'campaign_name' | 'topic' | null }
type PlatformSettings = Record<string, PlatformUTM>

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/

function buildDefaultPlatformSettings(): PlatformSettings {
  const s: PlatformSettings = {}
  for (const key of PLATFORM_KEYS) {
    const d = getPlatformDefault(key)
    s[key] = { source: d.source, medium: d.medium, mediumToken: null }
  }
  return s
}

function getValidationError(value: string): string | null {
  if (!value) return 'Required'
  if (!UTM_VALUE_PATTERN.test(value)) return 'Lowercase letters, numbers, hyphens, underscores only'
  return null
}

function getFallbackError(token: string, fallback: string): string | null {
  if (token === 'auto' || token === 'none') return null
  if (!fallback) return 'Required'
  if (!UTM_VALUE_PATTERN.test(fallback)) return 'Lowercase letters, numbers, hyphens, underscores only'
  return null
}

const MEDIUM_TOKEN_LABELS: Record<string, string> = {
  '':              'Custom value',
  campaign_name:   '{campaign_name}',
  topic:           '{topic}',
}

const CAMPAIGN_TOKEN_LABELS: Record<UTMTemplateCampaignToken, string> = {
  auto:          'Auto-ID (current)',
  campaign_name: 'Campaign name',
  custom:        'Custom value',
}

const CONTENT_TOKEN_LABELS: Record<UTMTemplateContentToken, string> = {
  auto:   'Auto-ID (current)',
  cta:    'CTA text',
  custom: 'Custom value',
}

const TERM_TOKEN_LABELS: Record<UTMTemplateTermToken, string> = {
  none:   'None (omit)',
  lens:   'Lens',
  voice:  'Voice',
  custom: 'Custom value',
}

export default function UTMSettingsPage() {
  const [platforms, setPlatforms]     = useState<PlatformSettings>(buildDefaultPlatformSettings())
  const [savedPlatforms, setSavedPlatforms] = useState<PlatformSettings>(buildDefaultPlatformSettings())
  const [templates, setTemplates]     = useState<UTMTemplateSettings>(DEFAULT_UTM_TEMPLATES)
  const [savedTemplates, setSavedTemplates] = useState<UTMTemplateSettings>(DEFAULT_UTM_TEMPLATES)
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)
  const [saveConfirmed, setSaveConfirmed] = useState(false)

  useEffect(() => {
    fetch('/api/workspace/utm')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          const { _templates, ...platformData } = d as Record<string, unknown> & { _templates?: UTMTemplateSettings }
          const ps: PlatformSettings = {}
          for (const key of PLATFORM_KEYS) {
            const entry = platformData[key] as { source: string; medium: string; mediumToken?: 'campaign_name' | 'topic' | null } | undefined
            if (entry) {
              ps[key] = { source: entry.source, medium: entry.medium, mediumToken: entry.mediumToken ?? null }
            } else {
              const def = getPlatformDefault(key)
              ps[key] = { source: def.source, medium: def.medium, mediumToken: null }
            }
          }
          setPlatforms(ps)
          setSavedPlatforms(ps)
          if (_templates) {
            setTemplates(_templates)
            setSavedTemplates(_templates)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const isDirty =
    JSON.stringify(platforms) !== JSON.stringify(savedPlatforms) ||
    JSON.stringify(templates) !== JSON.stringify(savedTemplates)

  const hasValidationErrors =
    PLATFORM_KEYS.some((key) =>
      getValidationError(platforms[key]?.source ?? '') ||
      getValidationError(platforms[key]?.medium ?? '')
    ) ||
    getFallbackError(templates.campaign.token, templates.campaign.fallback) !== null ||
    getFallbackError(templates.content.token,  templates.content.fallback)  !== null ||
    getFallbackError(templates.term.token,     templates.term.fallback)     !== null

  function updatePlatformField(platform: string, field: 'source' | 'medium', value: string) {
    setPlatforms((prev) => ({ ...prev, [platform]: { ...prev[platform], [field]: value } }))
  }

  function updateMediumToken(platform: string, token: 'campaign_name' | 'topic' | null) {
    setPlatforms((prev) => ({ ...prev, [platform]: { ...prev[platform], mediumToken: token } }))
  }

  function normalizePlatformField(platform: string, field: 'source' | 'medium') {
    setPlatforms((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], [field]: normalizeUTMValue(prev[platform][field]) },
    }))
  }

  function resetRow(key: string) {
    const d = getPlatformDefault(key)
    setPlatforms((prev) => ({ ...prev, [key]: { source: d.source, medium: d.medium, mediumToken: null } }))
  }

  function resetAll() {
    setPlatforms(buildDefaultPlatformSettings())
    setTemplates(DEFAULT_UTM_TEMPLATES)
  }

  const isRowCustomized = useCallback((key: string) => {
    const d = getPlatformDefault(key)
    return (
      platforms[key]?.source !== d.source ||
      platforms[key]?.medium !== d.medium ||
      platforms[key]?.mediumToken !== null
    )
  }, [platforms])

  async function handleSave() {
    if (!isDirty || hasValidationErrors) return
    setSaving(true)
    try {
      const payload = { ...platforms, _templates: templates }
      const res = await fetch('/api/workspace/utm', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const normalized = await res.json() as Record<string, unknown> & { _templates?: UTMTemplateSettings }
        const { _templates: normTemplates, ...normPlatforms } = normalized
        const ps: PlatformSettings = {}
        for (const key of PLATFORM_KEYS) {
          const entry = normPlatforms[key] as { source: string; medium: string; mediumToken?: 'campaign_name' | 'topic' | null } | undefined
          if (entry) ps[key] = { source: entry.source, medium: entry.medium, mediumToken: entry.mediumToken ?? null }
        }
        setPlatforms(ps)
        setSavedPlatforms(ps)
        if (normTemplates) {
          setTemplates(normTemplates)
          setSavedTemplates(normTemplates)
        }
        setSaveConfirmed(true)
        setTimeout(() => setSaveConfirmed(false), 2000)
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Attribution</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Configure how links in published posts are tagged so your analytics platform can attribute
          traffic by source, medium, and content.
        </p>
      </div>

      {/* ── Card 1: Per-channel sources ───────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-700">Per-channel sources</h2>
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 px-4 py-2.5 border-b border-zinc-100 bg-zinc-50">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Channel</p>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_source</p>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">utm_medium</p>
            <span />
          </div>

          {PLATFORM_KEYS.map((key, i) => {
            const platform   = DISTRIBUTION_PLATFORMS[key]
            const val        = platforms[key] ?? { source: '', medium: '', mediumToken: null }
            const sourceErr  = getValidationError(val.source)
            const mediumErr  = getValidationError(val.medium)
            const customized = isRowCustomized(key)
            const usingToken = val.mediumToken !== null

            return (
              <div
                key={key}
                className={cn(
                  'grid grid-cols-[1fr_1fr_1.5fr_auto] gap-4 px-4 py-3',
                  i < PLATFORM_KEYS.length - 1 && 'border-b border-zinc-100'
                )}
              >
                {/* Platform name */}
                <div className="flex items-start pt-2">
                  <span className="text-sm text-zinc-800 font-medium">{platform.label}</span>
                  {customized && (
                    <span className="ml-2 mt-0.5 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                      custom
                    </span>
                  )}
                </div>

                {/* utm_source */}
                <div>
                  <input
                    type="text"
                    value={val.source}
                    placeholder={getPlatformDefault(key).source}
                    onChange={(e) => updatePlatformField(key, 'source', e.target.value)}
                    onBlur={() => normalizePlatformField(key, 'source')}
                    className={cn(
                      'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                      sourceErr
                        ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                        : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
                    )}
                  />
                  {sourceErr && <p className="mt-1 text-xs text-red-500">{sourceErr}</p>}
                </div>

                {/* utm_medium — token select + value/fallback input */}
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    <select
                      value={val.mediumToken ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        updateMediumToken(key, v === '' ? null : v as 'campaign_name' | 'topic')
                      }}
                      className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 bg-white"
                    >
                      {Object.entries(MEDIUM_TOKEN_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={val.medium}
                        placeholder={usingToken ? 'fallback' : getPlatformDefault(key).medium}
                        onChange={(e) => updatePlatformField(key, 'medium', e.target.value)}
                        onBlur={() => normalizePlatformField(key, 'medium')}
                        className={cn(
                          'w-full rounded-md border px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1',
                          mediumErr
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                            : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200',
                          usingToken && 'text-zinc-400'
                        )}
                      />
                    </div>
                  </div>
                  {mediumErr && <p className="text-xs text-red-500">{mediumErr}</p>}
                  {usingToken && (
                    <p className="text-[10px] text-zinc-400">
                      Uses <span className="font-medium text-zinc-600">{val.mediumToken}</span>; falls back to <span className="font-medium text-zinc-600">{val.medium || '…'}</span>
                    </p>
                  )}
                </div>

                {/* Reset row */}
                <div className="flex items-start pt-2">
                  {customized ? (
                    <button
                      onClick={() => resetRow(key)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                      title="Reset to default"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <span className="h-3.5 w-3.5" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Card 2: Content templates ─────────────────────────────────────────── */}
      <div>
        <h2 className="mb-1 text-sm font-semibold text-zinc-700">Content templates</h2>
        <p className="mb-3 text-xs text-zinc-500">
          These values are resolved from the post content at publish time. Use tokens to make
          attribution dynamic across campaigns.
        </p>
        <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden divide-y divide-zinc-100">

          {/* utm_campaign */}
          <TemplateRow
            label="utm_campaign"
            tokenOptions={Object.entries(CAMPAIGN_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            token={templates.campaign.token}
            fallback={templates.campaign.fallback}
            fallbackLabel={templates.campaign.token === 'custom' ? 'Value' : 'Fallback'}
            showFallback={templates.campaign.token !== 'auto'}
            onTokenChange={(t) => setTemplates((prev) => ({ ...prev, campaign: { ...prev.campaign, token: t as UTMTemplateCampaignToken } }))}
            onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, campaign: { ...prev.campaign, fallback: f } }))}
            fallbackError={getFallbackError(templates.campaign.token, templates.campaign.fallback)}
            preview={
              templates.campaign.token === 'auto'
                ? 'utm_campaign=clout_c_abc123…'
                : templates.campaign.token === 'custom'
                ? `utm_campaign=${templates.campaign.fallback || '…'}`
                : `utm_campaign={campaign_name} or "${templates.campaign.fallback || '…'}"`
            }
          />

          {/* utm_content */}
          <TemplateRow
            label="utm_content"
            tokenOptions={Object.entries(CONTENT_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            token={templates.content.token}
            fallback={templates.content.fallback}
            fallbackLabel={templates.content.token === 'custom' ? 'Value' : 'Fallback'}
            showFallback={templates.content.token !== 'auto'}
            onTokenChange={(t) => setTemplates((prev) => ({ ...prev, content: { ...prev.content, token: t as UTMTemplateContentToken } }))}
            onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, content: { ...prev.content, fallback: f } }))}
            fallbackError={getFallbackError(templates.content.token, templates.content.fallback)}
            preview={
              templates.content.token === 'auto'
                ? 'utm_content=out_def456…'
                : templates.content.token === 'custom'
                ? `utm_content=${templates.content.fallback || '…'}`
                : `utm_content={cta} or "${templates.content.fallback || '…'}"`
            }
          />

          {/* utm_term */}
          <TemplateRow
            label="utm_term"
            tokenOptions={Object.entries(TERM_TOKEN_LABELS).map(([v, l]) => ({ value: v, label: l }))}
            token={templates.term.token}
            fallback={templates.term.fallback}
            fallbackLabel={templates.term.token === 'custom' ? 'Value' : 'Fallback'}
            showFallback={templates.term.token !== 'none'}
            onTokenChange={(t) => setTemplates((prev) => ({ ...prev, term: { ...prev.term, token: t as UTMTemplateTermToken } }))}
            onFallbackChange={(f) => setTemplates((prev) => ({ ...prev, term: { ...prev.term, fallback: f } }))}
            fallbackError={getFallbackError(templates.term.token, templates.term.fallback)}
            preview={
              templates.term.token === 'none'
                ? '(omitted)'
                : templates.term.token === 'custom'
                ? `utm_term=${templates.term.fallback || '…'}`
                : `utm_term={${templates.term.token}} or "${templates.term.fallback || '…'}"`
            }
          />

        </div>
      </div>

      {/* ── Actions ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !isDirty || hasValidationErrors}
          className={cn(
            'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
            saveConfirmed
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : saving || !isDirty || hasValidationErrors
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-zinc-900 text-white hover:bg-zinc-700'
          )}
        >
          {saveConfirmed
            ? <><Check className="h-4 w-4" /> Saved</>
            : saving
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            : <><Save className="h-4 w-4" /> Save changes</>}
        </button>

        <button
          onClick={resetAll}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset all to defaults
        </button>
      </div>
    </div>
  )
}

// ── TemplateRow sub-component ────────────────────────────────────────────────

interface TemplateRowProps {
  label:            string
  tokenOptions:     { value: string; label: string }[]
  token:            string
  fallback:         string
  fallbackLabel:    string
  showFallback:     boolean
  onTokenChange:    (token: string) => void
  onFallbackChange: (value: string) => void
  fallbackError:    string | null
  preview:          string
}

function TemplateRow({
  label, tokenOptions, token, fallback, fallbackLabel, showFallback,
  onTokenChange, onFallbackChange, fallbackError, preview,
}: TemplateRowProps) {
  const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/

  function normalizeOnBlur(value: string) {
    return value.trim().toLowerCase()
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono font-medium text-zinc-500 w-28 shrink-0">{label}</span>
        <select
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          className="rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-300 bg-white"
        >
          {tokenOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {showFallback && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-zinc-400">{fallbackLabel}:</span>
            <input
              type="text"
              value={fallback}
              onChange={(e) => onFallbackChange(e.target.value)}
              onBlur={(e) => onFallbackChange(normalizeOnBlur(e.target.value))}
              placeholder={fallbackLabel.toLowerCase()}
              className={cn(
                'rounded-md border px-2.5 py-1.5 text-xs text-zinc-900 placeholder:text-zinc-300 focus:outline-none focus:ring-1 w-36',
                fallbackError
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-200'
                  : 'border-zinc-200 focus:border-zinc-400 focus:ring-zinc-200'
              )}
            />
            {fallbackError && <p className="text-xs text-red-500">{fallbackError}</p>}
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-400 pl-[7.5rem] truncate">
        Preview: <span className="text-zinc-600">{preview}</span>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit 2>&1 | grep "utm" | head -20`
Expected: no output

- [ ] **Step 3: Run the full test suite to confirm nothing broke**

Run: `npx vitest run 2>&1 | tail -20`
Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add "app/[workspaceSlug]/(dashboard)/settings/utm/page.tsx"
git commit -m "feat: two-card UTM settings UI with medium tokens and content templates"
```

---

## Self-Review

**Spec coverage check:**
- `mediumToken` on `UTMConfig` → Task 1 ✓
- `UTMTemplateSettings` type + `DEFAULT_UTM_TEMPLATES` → Task 1 ✓
- `buildUTMParams` with `outputContext` + `templates` + `utm_term` → Task 2 ✓
- Publishing context loads `_templates` → Task 3 ✓
- `publishing.ts` passes `outputContext` → Task 4 ✓
- `lensName` / `campaignName` / `cta` / `voice` stored at save time → Task 5 ✓
- API GET returns merged platforms + templates → Task 6 ✓
- API PATCH validates + persists `_templates` → Task 6 ✓
- Two-card UI with medium token column → Task 7 ✓
- Content templates card (campaign / content / term) → Task 7 ✓
- Shared save/reset bar → Task 7 ✓
- Fallback when token can't be resolved → Task 2 (resolution logic) ✓

**Type consistency:** `UTMTemplateCampaignToken`, `UTMTemplateContentToken`, `UTMTemplateTermToken` defined in Task 1, used consistently in Tasks 2, 6, and 7. `UTMOutputContext` defined in Task 2, used in Tasks 4 and 2's test file. `PlatformUTM` in the page uses `mediumToken` consistent with Task 1's `UTMConfig`.

**Placeholder scan:** No TBDs. All code blocks are complete.
