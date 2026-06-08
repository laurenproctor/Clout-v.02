import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { updateConversationSource, deleteConversationSource } from '@/lib/domain/conversations'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const updates: Record<string, unknown> = {}
  for (const key of ['active', 'title', 'author'] as const) {
    if (key in body) updates[key] = body[key]
  }
  const result = await updateConversationSource(id, session.workspaceId, updates)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const result = await deleteConversationSource(id, session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json({ ok: true })
}
