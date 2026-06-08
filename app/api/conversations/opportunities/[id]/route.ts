import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { updateConversationOpportunityStatus } from '@/lib/domain/conversations'
import type { ConversationOpportunityStatus } from '@/types/domain'

const VALID: ConversationOpportunityStatus[] = ['active', 'saved', 'drafted', 'published', 'dismissed']

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  if (!body.status || !VALID.includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  const result = await updateConversationOpportunityStatus(id, session.workspaceId, body.status)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
