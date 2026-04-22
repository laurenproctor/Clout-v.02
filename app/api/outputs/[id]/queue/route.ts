import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getSchedulingPreferences, assignNextSlot } from '@/lib/domain/scheduling'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = await createClient()

  // Fetch already-queued slots for this workspace
  const { data: existing } = await supabase
    .from('outputs')
    .select('scheduled_at')
    .eq('workspace_id', session.workspaceId)
    .eq('status', 'queued')
    .is('deleted_at', null)

  const takenSlots = (existing ?? [])
    .map((r) => r.scheduled_at)
    .filter(Boolean) as string[]

  const prefs = await getSchedulingPreferences(session.workspaceId)
  const scheduledAt = assignNextSlot(prefs, takenSlots)

  const { data, error } = await supabase
    .from('outputs')
    .update({
      status: 'queued',
      scheduled_at: scheduledAt,
      approved_by: session.userId,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('workspace_id', session.workspaceId)
    .is('deleted_at', null)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, scheduledAt })
}
