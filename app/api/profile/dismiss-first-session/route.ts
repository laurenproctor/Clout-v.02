import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ first_session_dismissed_at: new Date().toISOString() })
    .eq('workspace_id', session.workspaceId)

  return NextResponse.json({ ok: true })
}
