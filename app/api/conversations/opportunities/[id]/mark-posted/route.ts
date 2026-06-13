import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createServiceClient } from '@/lib/supabase/service'
import {
  publishConversationResponse,
  updateConversationOpportunityStatus,
  listConversationResponses,
} from '@/lib/domain/conversations'

// Records that the user manually posted a Clout-drafted LinkedIn comment (Phase 4A,
// copy-only). DELIBERATELY does not import or call any Unipile client method — this is
// a local state change only (response → published, opportunity → published). The user
// did the posting on LinkedIn themselves.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: opportunityId } = await params
  const body = await req.json().catch(() => ({}))

  // Gate: workspace LinkedIn Assisted Engagement Beta. (Copy-only — no provider action.)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data: settings } = await supabase
    .from('workspace_feed_settings')
    .select('linkedin_beta')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()
  if (settings?.linkedin_beta?.assistedEngagement !== true) {
    return NextResponse.json(
      { error: 'LinkedIn Assisted Engagement Beta is not enabled for this workspace.' },
      { status: 403 },
    )
  }

  // Resolve the response: explicit responseId, else the latest draft for this opportunity.
  let responseId = typeof body.responseId === 'string' ? body.responseId : undefined
  if (!responseId) {
    const resp = await listConversationResponses(session.workspaceId, { opportunityId })
    if (!resp.ok) return NextResponse.json({ error: resp.error }, { status: 500 })
    responseId = (resp.data.find(r => r.status === 'draft') ?? resp.data[0])?.id
  }
  if (!responseId) return NextResponse.json({ error: 'No response to mark as posted' }, { status: 404 })

  const publishedUrl =
    typeof body.publishedUrl === 'string' && body.publishedUrl.trim() ? body.publishedUrl.trim() : null

  const published = await publishConversationResponse({
    id: responseId,
    workspaceId: session.workspaceId,
    content: typeof body.content === 'string' ? body.content : null,
    publishedChannel: 'linkedin',
    publishedUrl,
  })
  if (!published.ok) return NextResponse.json({ error: published.error }, { status: 500 })

  const opp = await updateConversationOpportunityStatus(opportunityId, session.workspaceId, 'published')
  if (!opp.ok) return NextResponse.json({ error: opp.error }, { status: 500 })

  return NextResponse.json({ ok: true, response: published.data, opportunity: opp.data })
}
