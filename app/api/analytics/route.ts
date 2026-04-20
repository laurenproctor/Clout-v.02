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

  // Last 6 months of data
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()

  const [capturesRes, outputsRes, approvalsRes, lensUsageRes] = await Promise.all([
    // Captures by month
    supabase
      .from('captures')
      .select('created_at')
      .eq('workspace_id', session.workspaceId)
      .eq('is_private', false)
      .is('deleted_at', null)
      .gte('created_at', sixMonthsAgo),

    // Outputs by status
    supabase
      .from('outputs')
      .select('status, created_at')
      .eq('workspace_id', session.workspaceId)
      .is('deleted_at', null)
      .gte('created_at', sixMonthsAgo),

    // Approvals (approved outputs)
    supabase
      .from('outputs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .eq('status', 'approved')
      .is('deleted_at', null),

    // Lens usage: which lenses have been used most
    supabase
      .from('generations')
      .select('lens_id, lenses(name)')
      .eq('workspace_id', session.workspaceId)
      .eq('status', 'complete')
      .gte('created_at', sixMonthsAgo),
  ])

  // Build monthly buckets for the last 6 months
  const months: string[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  function bucketByMonth(rows: Array<{ created_at: string }>) {
    const counts: Record<string, number> = {}
    months.forEach((m) => { counts[m] = 0 })
    rows.forEach((r) => {
      const d = new Date(r.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (key in counts) counts[key]++
    })
    return months.map((m) => ({ month: m, count: counts[m] }))
  }

  const capturesByMonth = bucketByMonth(capturesRes.data ?? [])
  const outputsByMonth = bucketByMonth(outputsRes.data ?? [])

  // Status breakdown
  const statusCounts: Record<string, number> = {}
  ;(outputsRes.data ?? []).forEach((o) => {
    statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1
  })

  // Lens usage counts
  const lensMap: Record<string, { name: string; count: number }> = {}
  ;(lensUsageRes.data ?? []).forEach((g: Record<string, unknown>) => {
    const lensId = g.lens_id as string
    const lensName = (g.lenses as { name: string } | null)?.name ?? 'Unknown'
    if (!lensMap[lensId]) lensMap[lensId] = { name: lensName, count: 0 }
    lensMap[lensId].count++
  })
  const topLenses = Object.values(lensMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    months,
    capturesByMonth,
    outputsByMonth,
    statusBreakdown: statusCounts,
    totalApproved: approvalsRes.count ?? 0,
    topLenses,
    totals: {
      captures: capturesRes.data?.length ?? 0,
      outputs: outputsRes.data?.length ?? 0,
    },
  })
}
