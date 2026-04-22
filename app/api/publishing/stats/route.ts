import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('outputs')
    .select('status')
    .eq('workspace_id', session.workspaceId)
    .in('status', ['queued', 'publishing', 'published', 'failed'])
    .is('deleted_at', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const counts = (data ?? []).reduce(
    (acc, row) => {
      acc[row.status] = (acc[row.status] ?? 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return NextResponse.json({
    queued:     counts['queued']     ?? 0,
    publishing: counts['publishing'] ?? 0,
    published:  counts['published']  ?? 0,
    failed:     counts['failed']     ?? 0,
  })
}
