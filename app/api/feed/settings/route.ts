import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { mapToneToVoices, mapVoicesToTone } from '@/lib/feed/toneMapping'
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
    .select('brand_name, content_topics, services, tone_preference, competitors')
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
      editorial_voices,
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
    editorial_voices?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('workspace_feed_settings')
    .upsert(
      {
        workspace_id: session.workspaceId,
        brand_name: body.brand_name ?? '',
        content_topics: body.content_topics ?? [],
        services: body.services ?? [],
        competitors: body.competitors ?? [],
        tone_preference: body.editorial_voices
          ? mapVoicesToTone(body.editorial_voices)
          : 'authoritative',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workspace_id' }
    )

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
