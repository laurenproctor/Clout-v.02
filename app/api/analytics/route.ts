import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date()
  const { searchParams } = new URL(req.url)

  // Date range — default to last 6 months
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')
  const fromDate = fromParam
    ? new Date(fromParam + 'T00:00:00Z')
    : new Date(now.getFullYear(), now.getMonth() - 5, 1)
  const toDate = toParam ? new Date(toParam + 'T23:59:59Z') : now
  const fromISO = fromDate.toISOString()
  const toISO = toDate.toISOString()

  const [capturesRes, outputsRes, approvalsRes, lensUsageRes] = await Promise.all([
    // Captures by month
    supabase
      .from('captures')
      .select('created_at')
      .eq('workspace_id', session.workspaceId)
      .eq('is_private', false)
      .is('deleted_at', null)
      .gte('created_at', fromISO)
      .lte('created_at', toISO),

    // Outputs by status and content_type
    supabase
      .from('outputs')
      .select('status, content_type, created_at')
      .eq('workspace_id', session.workspaceId)
      .is('deleted_at', null)
      .gte('created_at', fromISO)
      .lte('created_at', toISO),

    // Approvals within the selected range
    supabase
      .from('outputs')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', session.workspaceId)
      .eq('status', 'approved')
      .is('deleted_at', null)
      .gte('created_at', fromISO)
      .lte('created_at', toISO),

    // Lens usage within the selected range
    supabase
      .from('generations')
      .select('lens_id, lenses(name)')
      .eq('workspace_id', session.workspaceId)
      .eq('status', 'complete')
      .gte('created_at', fromISO)
      .lte('created_at', toISO),
  ])

  // Build monthly buckets spanning fromDate → toDate
  const months: string[] = []
  const cursor = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1)
  const endMonth = new Date(toDate.getFullYear(), toDate.getMonth(), 1)
  while (cursor <= endMonth) {
    months.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`)
    cursor.setMonth(cursor.getMonth() + 1)
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

  // Content type breakdown
  const CONTENT_TYPE_LABELS: Record<string, string> = {
    blog: 'Blog Posts',
    linkedin: 'LinkedIn Posts',
    syndication: 'Syndication',
    twitter: 'X / Twitter',
    newsletter: 'Newsletter',
    standard: 'Standard',
    framework: 'Framework',
    authority: 'Authority',
    contrarian: 'Contrarian',
    taste: 'Taste',
    incentive: 'Incentive',
  }
  const contentTypeCounts: Record<string, number> = {}
  ;(outputsRes.data ?? []).forEach((o) => {
    const ct = o.content_type ?? 'standard'
    contentTypeCounts[ct] = (contentTypeCounts[ct] ?? 0) + 1
  })
  const contentTypeBreakdown = Object.entries(contentTypeCounts)
    .map(([type, count]) => ({ type, label: CONTENT_TYPE_LABELS[type] ?? type, count }))
    .sort((a, b) => b.count - a.count)

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
    contentTypeBreakdown,
    totalApproved: approvalsRes.count ?? 0,
    topLenses,
    totals: {
      captures: capturesRes.data?.length ?? 0,
      outputs: outputsRes.data?.length ?? 0,
    },
  })
}
