import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { dispatchEmail } from '@/lib/trigger/jobs/dispatch-email'
import type { EmailPayload } from '@/types/domain'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUser = await createClient()
  const { data: caller } = await supabaseUser
    .from('users')
    .select('operator_role')
    .eq('id', session.userId)
    .single()

  if (caller?.operator_role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { eventId } = await req.json()
  if (!eventId) {
    return NextResponse.json({ error: 'eventId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data: event, error } = await supabase
    .from('email_events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  if (event.status !== 'failed') {
    return NextResponse.json({ error: 'Only failed events can be resent' }, { status: 422 })
  }

  // Reset record so dispatcher can re-attempt with same idempotency key
  await supabase
    .from('email_events')
    .update({ status: 'pending', error: null, attempt_count: 0 })
    .eq('id', eventId)

  await dispatchEmail.trigger(event.payload as unknown as EmailPayload)

  return NextResponse.json({ ok: true })
}
