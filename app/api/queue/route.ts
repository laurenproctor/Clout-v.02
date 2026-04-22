import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('outputs')
    .select('id, title, content, status, scheduled_at, channel_id, created_at, updated_at')
    .eq('workspace_id', session.workspaceId)
    .eq('status', 'queued')
    .is('deleted_at', null)
    .order('scheduled_at', { ascending: true })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
