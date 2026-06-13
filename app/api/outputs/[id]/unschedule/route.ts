import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput } from '@/lib/domain/output'
import { unscheduleOutput } from '@/lib/domain/publishing'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const ok = await unscheduleOutput(id)
  if (!ok) {
    return NextResponse.json(
      { error: 'This post is already publishing and can no longer be unscheduled.' },
      { status: 409 }
    )
  }

  return NextResponse.json({ success: true, status: 'approved' })
}
