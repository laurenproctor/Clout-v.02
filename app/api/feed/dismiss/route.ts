import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let cardId: string
  try {
    const body = await req.json()
    cardId = body.cardId
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!cardId || typeof cardId !== 'string') {
    return NextResponse.json({ error: 'cardId is required' }, { status: 400 })
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('user_signal_interactions')
    .insert({
      user_id: session.userId,
      signal_card_id: cardId,
      interaction_type: 'dismissed',
    })

  if (error) {
    // Ignore duplicate dismissals (unique violation or similar)
    if (!error.code?.startsWith('23')) {
      console.error('[feed/dismiss] insert failed:', error)
      return NextResponse.json({ error: 'Failed to dismiss card' }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
