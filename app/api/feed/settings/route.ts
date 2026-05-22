import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { mapToneToVoices } from '@/lib/feed/toneMapping'
import type { TonePreference } from '@/types/feed'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
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
  const competitors = rawCompetitors.map(c => c.name)

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
