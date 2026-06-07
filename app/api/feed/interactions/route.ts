import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { UserSignalInteractionType } from '@/types/feed'
import type { Json } from '@/types/db'

const VALID_INTERACTION_TYPES: UserSignalInteractionType[] = [
  'dismissed',
  'card_expanded',
  'source_opened',
  'draft_started',
  'draft_edited',
  'draft_copied',
  'published',
]

// Minimum new interactions since last profile update before triggering Claude profile job
const PROFILE_TRIGGER_THRESHOLD = 5
// Minimum minutes between profile job triggers per workspace
const PROFILE_COOLDOWN_MINUTES = 10

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { signal_card_id?: string; interaction_type?: string; interaction_data?: Json }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { signal_card_id, interaction_type, interaction_data } = body

  if (!signal_card_id || typeof signal_card_id !== 'string') {
    return NextResponse.json({ error: 'signal_card_id required' }, { status: 400 })
  }
  if (!interaction_type || !VALID_INTERACTION_TYPES.includes(interaction_type as UserSignalInteractionType)) {
    return NextResponse.json({ error: 'Invalid interaction_type' }, { status: 400 })
  }

  const { userId, workspaceId } = session
  const supabase = await createClient()

  // Insert interaction
  const { error: insertError } = await supabase
    .from('user_signal_interactions')
    .insert({
      user_id: userId,
      signal_card_id,
      interaction_type: interaction_type as UserSignalInteractionType,
      interaction_data: interaction_data ?? null,
    })

  if (insertError) {
    console.error('[interactions] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to record interaction' }, { status: 500 })
  }

  // Check whether to trigger the Claude preference profile job
  void triggerProfileJobIfReady(supabase, userId, workspaceId)

  return NextResponse.json({ ok: true })
}

async function triggerProfileJobIfReady(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string,
  workspaceId: string,
) {
  try {
    // Load current feed_preferences to get last_updated
    const { data: ws } = await supabase
      .from('workspace_feed_settings')
      .select('feed_preferences')
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    const feedPrefs = ws?.feed_preferences as { last_updated?: string } | null
    const lastUpdated = feedPrefs?.last_updated ? new Date(feedPrefs.last_updated) : null

    // Enforce cooldown
    if (lastUpdated) {
      const minutesSinceUpdate = (Date.now() - lastUpdated.getTime()) / 60_000
      if (minutesSinceUpdate < PROFILE_COOLDOWN_MINUTES) return
    }

    // Count qualifying interactions since last profile update
    let countQuery = supabase
      .from('user_signal_interactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('interaction_type', ['dismissed', 'card_expanded', 'source_opened', 'draft_started', 'draft_edited', 'draft_copied', 'published'])

    if (lastUpdated) {
      countQuery = countQuery.gte('created_at', lastUpdated.toISOString())
    }

    const { count } = await countQuery

    if ((count ?? 0) >= PROFILE_TRIGGER_THRESHOLD) {
      await tasks.trigger('derive-feed-preferences', { workspace_id: workspaceId, user_id: userId })
    }
  } catch (err) {
    // Non-fatal — interaction was recorded successfully
    console.error('[interactions] profile trigger check failed:', err)
  }
}
