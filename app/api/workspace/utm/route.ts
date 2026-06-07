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
} from '@/lib/distribution/platform-registry'

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/
const CAMPAIGN_TOKENS:  UTMTemplateCampaignToken[] = ['auto', 'campaign_name', 'date', 'custom']
const CONTENT_TOKENS:   UTMTemplateContentToken[]  = ['auto', 'cta', 'date', 'custom']
const TERM_TOKENS:      UTMTemplateTermToken[]      = ['none', 'lens', 'voice', 'date', 'custom']

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

function validateTemplates(raw: unknown): { error: string } | { templates: UTMTemplateSettings } {
  if (typeof raw !== 'object' || raw === null) return { error: 'Invalid _templates object' }
  const t = raw as Record<string, unknown>

  const camp = t.campaign as Record<string, unknown> | undefined
  if (!camp) return { error: '_templates.campaign is required' }
  if (!CAMPAIGN_TOKENS.includes(camp.token as UTMTemplateCampaignToken)) {
    return { error: `_templates.campaign.token must be one of: ${CAMPAIGN_TOKENS.join(', ')}` }
  }
  const campFallbackRequired = camp.token !== 'auto' && camp.token !== 'date'
  const campErr = validateFallback(camp.fallback, '_templates.campaign.fallback', campFallbackRequired)
  if (campErr) return { error: campErr }
  if (camp.token === 'date') {
    const fmtErr = validateDateFormat(camp.dateFormat, '_templates.campaign.dateFormat')
    if (fmtErr) return { error: fmtErr }
  }

  const cont = t.content as Record<string, unknown> | undefined
  if (!cont) return { error: '_templates.content is required' }
  if (!CONTENT_TOKENS.includes(cont.token as UTMTemplateContentToken)) {
    return { error: `_templates.content.token must be one of: ${CONTENT_TOKENS.join(', ')}` }
  }
  const contFallbackRequired = cont.token !== 'auto' && cont.token !== 'date'
  const contErr = validateFallback(cont.fallback, '_templates.content.fallback', contFallbackRequired)
  if (contErr) return { error: contErr }
  if (cont.token === 'date') {
    const fmtErr = validateDateFormat(cont.dateFormat, '_templates.content.dateFormat')
    if (fmtErr) return { error: fmtErr }
  }

  const term = t.term as Record<string, unknown> | undefined
  if (!term) return { error: '_templates.term is required' }
  if (!TERM_TOKENS.includes(term.token as UTMTemplateTermToken)) {
    return { error: `_templates.term.token must be one of: ${TERM_TOKENS.join(', ')}` }
  }
  const termFallbackRequired = ['lens', 'voice', 'custom'].includes(term.token as string)
  const termErr = validateFallback(term.fallback, '_templates.term.fallback', termFallbackRequired)
  if (termErr) return { error: termErr }
  if (term.token === 'date') {
    const fmtErr = validateDateFormat(term.dateFormat, '_templates.term.dateFormat')
    if (fmtErr) return { error: fmtErr }
  }

  return {
    templates: {
      campaign: {
        token:      camp.token as UTMTemplateCampaignToken,
        fallback:   (camp.fallback as string) ?? '',
        dateFormat: camp.token === 'date' ? ((camp.dateFormat as UTMDateFormat) ?? DEFAULT_UTM_DATE_FORMAT) : undefined,
      },
      content: {
        token:      cont.token as UTMTemplateContentToken,
        fallback:   (cont.fallback as string) ?? '',
        dateFormat: cont.token === 'date' ? ((cont.dateFormat as UTMDateFormat) ?? DEFAULT_UTM_DATE_FORMAT) : undefined,
      },
      term: {
        token:      term.token as UTMTemplateTermToken,
        fallback:   (term.fallback as string) ?? '',
        dateFormat: term.token === 'date' ? ((term.dateFormat as UTMDateFormat) ?? DEFAULT_UTM_DATE_FORMAT) : undefined,
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
