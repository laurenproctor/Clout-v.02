import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [capturesRes, generationsRes] = await Promise.all([
    supabase
      .from('captures')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .gte('created_at', monthStart)
      .is('deleted_at', null),
    supabase
      .from('generations')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .gte('created_at', monthStart),
  ])

  return NextResponse.json({
    captures_this_month: capturesRes.count ?? 0,
    generations_this_month: generationsRes.count ?? 0,
  })
}
