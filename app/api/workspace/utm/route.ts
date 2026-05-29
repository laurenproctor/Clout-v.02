import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import {
  DISTRIBUTION_PLATFORMS,
  PLATFORM_KEYS,
  getPlatformDefault,
  normalizeUTMValue,
  UTMConfig,
} from '@/lib/distribution/platform-registry'

const UTM_VALUE_PATTERN = /^[a-z0-9_-]+$/

function validateUTMValue(value: unknown, field: string): string | null {
  if (typeof value !== 'string' || value.length === 0) return `${field} is required`
  if (value.length > 50) return `${field} must be 50 characters or fewer`
  if (!UTM_VALUE_PATTERN.test(value)) return `${field} must be lowercase alphanumeric with hyphens or underscores only`
  return null
}

function validateSettings(body: unknown): { error: string } | { settings: Record<string, UTMConfig> } {
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

    settings[key] = {
      source: normalizeUTMValue(e.source as string),
      medium: normalizeUTMValue(e.medium as string),
    }
  }

  // Reject unknown keys
  for (const key of Object.keys(input)) {
    if (!DISTRIBUTION_PLATFORMS[key]) return { error: `Unknown platform: ${key}` }
  }

  return { settings }
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

  const stored = (data?.utm_settings ?? {}) as Record<string, Partial<UTMConfig>>

  // Merge stored overrides with canonical defaults
  const merged: Record<string, UTMConfig> = {}
  for (const key of PLATFORM_KEYS) {
    const defaults = getPlatformDefault(key)
    const override = stored[key]
    merged[key] = {
      source: override?.source ?? defaults.source,
      medium: override?.medium ?? defaults.medium,
    }
  }

  return NextResponse.json(merged)
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
      utm_settings: result.settings,
      updated_by: session.userId,
    })
    .eq('workspace_id', session.workspaceId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(result.settings)
}
