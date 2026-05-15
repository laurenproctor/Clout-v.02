import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [capturesRes, outputsRes, draftsRes] = await Promise.all([
    supabase
      .from('captures')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .is('deleted_at', null)
      .gte('created_at', monthStart),

    supabase
      .from('outputs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .is('deleted_at', null),

    supabase
      .from('outputs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .eq('status', 'draft')
      .is('deleted_at', null),
  ])

  return NextResponse.json({
    capturesThisMonth: capturesRes.count ?? 0,
    outputsGenerated: outputsRes.count ?? 0,
    draftsAwaitingReview: draftsRes.count ?? 0,
  })
}
