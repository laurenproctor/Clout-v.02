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
  UTMDateFormat,
  UTM_DATE_FORMATS,
  DEFAULT_UTM_DATE_FORMAT,
  UTMFallbackKind,
  UTM_FALLBACK_KINDS,
} from '@/lib/distribution/platform-registry'

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/
const CAMPAIGN_TOKENS:  UTMTemplateCampaignToken[] = ['auto', 'campaign_name', 'date', 'custom']
const CONTENT_TOKENS:   UTMTemplateContentToken[]  = ['auto', 'cta', 'date', 'custom']
const TERM_TOKENS:      UTMTemplateTermToken[]      = ['none', 'lens', 'voice', 'date', 'custom']

// Tokens whose value is resolved dynamically at publish time and therefore
// support a 'date' fallback when resolution comes back empty.
const FALLBACK_DATE_TOKENS = ['campaign_name', 'cta', 'lens', 'voice']

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

function validateDateFormat(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (!UTM_DATE_FORMATS.includes(value as UTMDateFormat)) {
    return `${field} must be one of: ${UTM_DATE_FORMATS.join(', ')}`
  }
  return null
}

type NormalizedEntry = {
  token:        string
  fallback:     string
  fallbackKind?: UTMFallbackKind
  dateFormat?:  UTMDateFormat
}

// Validates and normalizes a single template field (campaign/content/term).
// `fallbackRequiredTokens` lists the tokens whose static fallback is mandatory
// when the field does not use a date fallback.
function validateEntry(
  raw: unknown,
  field: string,
  allowedTokens: string[],
  fallbackRequiredTokens: string[],
): { error: string } | { entry: NormalizedEntry } {
  if (typeof raw !== 'object' || raw === null) return { error: `${field} is required` }
  const e = raw as Record<string, unknown>

  const token = e.token as string
  if (!allowedTokens.includes(token)) {
    return { error: `${field}.token must be one of: ${allowedTokens.join(', ')}` }
  }

  let fallbackKind: UTMFallbackKind | undefined
  if (e.fallbackKind !== undefined && e.fallbackKind !== null) {
    if (!UTM_FALLBACK_KINDS.includes(e.fallbackKind as UTMFallbackKind)) {
      return { error: `${field}.fallbackKind must be one of: ${UTM_FALLBACK_KINDS.join(', ')}` }
    }
    fallbackKind = e.fallbackKind as UTMFallbackKind
  }
  const usesDateFallback = fallbackKind === 'date'
  if (usesDateFallback && !FALLBACK_DATE_TOKENS.includes(token)) {
    return { error: `${field}.fallbackKind 'date' is only valid for tokens: ${FALLBACK_DATE_TOKENS.join(', ')}` }
  }

  const fallbackRequired = fallbackRequiredTokens.includes(token) && !usesDateFallback
  const fbErr = validateFallback(e.fallback, `${field}.fallback`, fallbackRequired)
  if (fbErr) return { error: fbErr }

  const usesDate = token === 'date' || usesDateFallback
  if (usesDate) {
    const fmtErr = validateDateFormat(e.dateFormat, `${field}.dateFormat`)
    if (fmtErr) return { error: fmtErr }
  }

  return {
    entry: {
      token,
      fallback:     (e.fallback as string) ?? '',
      fallbackKind: usesDateFallback ? 'date' : undefined,
      dateFormat:   usesDate ? ((e.dateFormat as UTMDateFormat) ?? DEFAULT_UTM_DATE_FORMAT) : undefined,
    },
  }
}

function validateTemplates(raw: unknown): { error: string } | { templates: UTMTemplateSettings } {
  if (typeof raw !== 'object' || raw === null) return { error: 'Invalid _templates object' }
  const t = raw as Record<string, unknown>

  const camp = validateEntry(t.campaign, '_templates.campaign', CAMPAIGN_TOKENS, ['campaign_name', 'custom'])
  if ('error' in camp) return camp
  const cont = validateEntry(t.content, '_templates.content', CONTENT_TOKENS, ['cta', 'custom'])
  if ('error' in cont) return cont
  const term = validateEntry(t.term, '_templates.term', TERM_TOKENS, ['lens', 'voice', 'custom'])
  if ('error' in term) return term

  return {
    templates: {
      campaign: { ...camp.entry, token: camp.entry.token as UTMTemplateCampaignToken },
      content:  { ...cont.entry, token: cont.entry.token as UTMTemplateContentToken },
      term:     { ...term.entry, token: term.entry.token as UTMTemplateTermToken },
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
      if (e.mediumToken !== 'campaign_name') {
        return { error: `${key}.mediumToken must be 'campaign_name' or null` }
      }
    }

    settings[key] = {
      source:      normalizeUTMValue(e.source as string),
      medium:      normalizeUTMValue(e.medium as string),
      mediumToken: (e.mediumToken as 'campaign_name' | null | undefined) ?? null,
    }
  }

  for (const key of Object.keys(input)) {
    if (key === '_templates') continue
    if (!DISTRIBUTION_PLATFORMS[key]) return { error: `Unknown platform: ${key}` }
  }

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
