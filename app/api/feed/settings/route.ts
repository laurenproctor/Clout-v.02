import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { mapToneToVoices, mapVoicesToTone } from '@/lib/feed/toneMapping'
import { ingestWorkspaceTopics } from '@/lib/feed/ingest'
import type { TonePreference } from '@/types/feed'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Primary: workspace-scoped feed settings
  const { data: ws } = await supabase
    .from('workspace_feed_settings')
    .select('brand_name, content_topics, services, tone_preference, competitors, competitor_metadata, website_url')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()

  if (ws) {
    const editorial_voices = ws.tone_preference
      ? mapToneToVoices(ws.tone_preference as TonePreference)
      : []

    return NextResponse.json({
      brand_name: ws.brand_name ?? '',
      content_topics: ws.content_topics ?? [],
      services: ws.services ?? [],
      competitors: ws.competitors ?? [],
      competitor_metadata: ws.competitor_metadata ?? {},
      editorial_voices,
      website_url: ws.website_url ?? null,
    })
  }

  // Fallback: user_profiles (pre-migration data for existing users)
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('brand_name, content_topics, services, tone_preference, competitors')
    .eq('id', session.userId)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({
      brand_name: '',
      content_topics: [],
      services: [],
      competitors: [],
      editorial_voices: [],
    })
  }

  const rawCompetitors = (profile.competitors ?? []) as Array<{ name: string; handle: string; url: string }>
  const competitors = rawCompetitors.map(c => c.url || c.name).filter(Boolean)
  const editorial_voices = profile.tone_preference
    ? mapToneToVoices(profile.tone_preference as TonePreference)
    : []

  return NextResponse.json({
    brand_name: profile.brand_name ?? '',
    content_topics: profile.content_topics ?? [],
    services: profile.services ?? [],
    competitors,
    editorial_voices,
  })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    brand_name?: string
    content_topics?: string[]
    services?: string[]
    competitors?: string[]
    competitor_metadata?: Record<string, { name?: string; rss_url?: string; socials?: Record<string, string> }>
    editorial_voices?: string[]
    website_url?: string | null
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()

  // Build update object with only the fields explicitly provided in the request body.
  // This prevents a partial call (e.g. { website_url }) from clearing unrelated fields.
  type SettingsRow = import('@/types/db').Database['public']['Tables']['workspace_feed_settings']['Insert']
  const updateFields: Partial<SettingsRow> & { workspace_id: string } = {
    workspace_id: session.workspaceId,
    updated_at: new Date().toISOString(),
  }
  if (body.brand_name !== undefined) updateFields.brand_name = body.brand_name ?? ''
  if (body.content_topics !== undefined) updateFields.content_topics = body.content_topics ?? []
  if (body.services !== undefined) updateFields.services = body.services ?? []
  if (body.competitors !== undefined) updateFields.competitors = body.competitors ?? []
  if (body.competitor_metadata !== undefined) updateFields.competitor_metadata = (body.competitor_metadata ?? {}) as import('@/types/db').Json
  if (body.editorial_voices !== undefined) updateFields.tone_preference = mapVoicesToTone(body.editorial_voices)
  if (body.website_url !== undefined) updateFields.website_url = body.website_url ?? null

  const { error } = await supabase
    .from('workspace_feed_settings')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .upsert(updateFields as any, { onConflict: 'workspace_id' })

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  // Trigger background ingestion for the saved topics/services so the feed
  // reflects the new settings without waiting for the daily cron.
  after(async () => {
    await ingestWorkspaceTopics({
      topics: body.content_topics ?? [],
      services: body.services ?? [],
    }).catch(err => console.error('[feed/settings] background ingest failed:', err))
  })

  return NextResponse.json({ success: true })
}
