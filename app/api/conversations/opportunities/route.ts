import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listConversationOpportunities, getConversationPreferences } from '@/lib/domain/conversations'
import { matchesBlockedKeyword, buildSearchableText } from '@/lib/conversations/utils'
import type { ConversationOpportunity, ConversationOpportunityStatus } from '@/types/domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const status = (req.nextUrl.searchParams.get('status') ?? 'active') as ConversationOpportunityStatus
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? 50), 100)
  const offset = Number(req.nextUrl.searchParams.get('offset') ?? 0)

  const prefsResult = await getConversationPreferences(session.workspaceId)
  const prefs = prefsResult.ok ? prefsResult.data : null
  const minScore = prefs?.minOpportunityScore ?? 0
  const blockedKeywords = prefs?.blockedKeywords ?? []

  const result = await listConversationOpportunities(session.workspaceId, { status, limit, offset, minScore })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  let opportunities: ConversationOpportunity[] = result.data
  if (blockedKeywords.length > 0) {
    opportunities = opportunities.filter(opp => {
      const item = opp.item
      const text = buildSearchableText([item?.title, item?.excerpt, item?.summary])
      return !matchesBlockedKeyword(text, blockedKeywords)
    })
  }

  return NextResponse.json(opportunities)
}
