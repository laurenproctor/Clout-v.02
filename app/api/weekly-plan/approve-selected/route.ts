import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { approveSelected } from '@/lib/domain/weekly-plan'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const approvals = body.approvals as Array<{ outputId: string; scheduledAt: string | null }>

  if (!Array.isArray(approvals) || approvals.length === 0) {
    return NextResponse.json({ error: 'approvals array is required' }, { status: 400 })
  }

  try {
    await approveSelected(session.workspaceId, approvals)
    return NextResponse.json({ ok: true, count: approvals.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Approval failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
