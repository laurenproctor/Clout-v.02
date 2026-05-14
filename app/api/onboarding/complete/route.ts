import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingPayload } from '@/types/feed'

// POST /api/onboarding/complete
// Feed-specific onboarding — distinct from /api/onboarding (workspace/profile setup).
// Upserts user_profiles with brand, niche, services, competitors, content_topics.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Partial<OnboardingPayload>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'brand_name is required' }, { status: 400 })
  }

  if (!body.brand_name?.trim()) {
    return NextResponse.json({ error: 'brand_name is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase.from('user_profiles').upsert(
      {
        id: session.userId,
        brand_name: body.brand_name,
        niche: body.niche ?? null,
        services: body.services ?? [],
        tone_preference: body.tone_preference ?? 'authoritative',
        competitors: body.competitors ?? [],
        content_topics: body.content_topics ?? [],
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
