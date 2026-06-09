import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getConversationPreferences, upsertConversationPreferences } from '@/lib/domain/conversations'
import type { ConversationPreferences } from '@/types/domain'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const result = await getConversationPreferences(session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const patch: Partial<ConversationPreferences> = {}

  if ('focusTopics' in body) {
    if (!Array.isArray(body.focusTopics)) {
      return NextResponse.json({ error: 'focusTopics must be an array' }, { status: 400 })
    }
    const topics = (body.focusTopics as unknown[])
      .filter(t => typeof t === 'string' && t.trim())
      .map(t => (t as string).trim().slice(0, 100))
    if (topics.length > 25) {
      return NextResponse.json({ error: 'focusTopics may contain at most 25 items' }, { status: 400 })
    }
    patch.focusTopics = topics
  }

  if ('blockedKeywords' in body) {
    if (!Array.isArray(body.blockedKeywords)) {
      return NextResponse.json({ error: 'blockedKeywords must be an array' }, { status: 400 })
    }
    const keywords = (body.blockedKeywords as unknown[])
      .filter(k => typeof k === 'string' && k.trim())
      .map(k => (k as string).trim().slice(0, 50))
    if (keywords.length > 100) {
      return NextResponse.json({ error: 'blockedKeywords may contain at most 100 items' }, { status: 400 })
    }
    patch.blockedKeywords = keywords
  }

  if ('minOpportunityScore' in body) {
    const score = Number(body.minOpportunityScore)
    if (!Number.isFinite(score)) {
      return NextResponse.json({ error: 'minOpportunityScore must be a number' }, { status: 400 })
    }
    patch.minOpportunityScore = Math.max(0, Math.min(100, Math.round(score)))
  }

  if ('mutedSources' in body) {
    if (!Array.isArray(body.mutedSources)) {
      return NextResponse.json({ error: 'mutedSources must be an array' }, { status: 400 })
    }
    patch.mutedSources = (body.mutedSources as unknown[]).filter(s => typeof s === 'string')
  }

  const result = await upsertConversationPreferences(session.workspaceId, patch)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}
