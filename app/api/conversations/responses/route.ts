import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { callClaude } from '@/lib/ai/generate'
import { insertConversationResponse, listConversationResponses, loadConversationWorkspaceContext } from '@/lib/domain/conversations'
import { createClient } from '@/lib/supabase/server'

const RESPONSE_GUIDE: Record<string, string> = {
  comment: 'Write a short, thoughtful comment (2-4 sentences). Add one specific insight. Be direct.',
  note: 'Write a Substack Note (200 words max). Hook in first line. One clear idea. No hashtags.',
  post: 'Write a LinkedIn post (150-300 words). Strong hook, concrete insight, clear takeaway.',
  framework: 'Create a 3-4 step reusable framework that distills the key concept. Title each step.',
  narrative: 'Write a personal story (250-400 words) connecting this topic to a real experience.',
  question: 'Write one sharp, thought-provoking question (1-2 sentences) that advances the discussion.',
  counterpoint: 'Write a respectful counterpoint (150-250 words). Acknowledge the original, then challenge specifically.',
  agreement: 'Write a supporting post (150-250 words) validating the idea from a different angle.',
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const opportunityId = req.nextUrl.searchParams.get('opportunity_id') ?? undefined
  const result = await listConversationResponses(session.workspaceId, { opportunityId })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.opportunityId || !body?.responseType) {
    return NextResponse.json({ error: 'opportunityId and responseType required' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const { data: opp, error: oppErr } = await supabase
    .from('conversation_opportunities')
    .select('*, item:conversation_items(title, excerpt, body_markdown, source_url, author, provider, provider_url, provider_social_id)')
    .eq('id', body.opportunityId)
    .eq('workspace_id', session.workspaceId)
    .single()
  if (oppErr || !opp) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

  const context = await loadConversationWorkspaceContext(session.workspaceId)
  // LinkedIn comments get a public-reply guide; everything else uses the generic guide.
  const isLinkedInComment = opp.item?.provider === 'linkedin' && body.responseType === 'comment'
  const typeGuide = isLinkedInComment
    ? 'Write a concise, substantive LinkedIn comment (2-4 sentences) as a public professional reply. Add one specific, relevant perspective or example that moves the conversation forward. No "great post" / "well said" filler, no hashtags. Sound like a thoughtful peer, not a fan.'
    : (RESPONSE_GUIDE[body.responseType] ?? 'Write an appropriate response.')
  const content = (opp.item?.body_markdown ?? opp.item?.excerpt ?? '').slice(0, 600)

  const aiResult = await callClaude({
    systemPrompt: `You are a ghostwriter for ${context.displayName}.
Voice/Tone: ${context.toneNotes || 'professional and direct'}
Mental models: ${context.mentalModels}
Philosophies: ${context.philosophies}

${typeGuide}

Write in first person as ${context.displayName}. Avoid generic openers like "Great point" or "I completely agree". No AI-sounding language. Return only the response text, ready to use.`,
    userMessage: `Opportunity: ${opp.title}
Why to participate: ${opp.explanation}
${isLinkedInComment ? 'LinkedIn post' : 'Article'}: ${opp.item?.title ?? 'Untitled'}
Content: ${content}
Author: ${opp.item?.author ?? 'Unknown'}${isLinkedInComment && opp.item?.source_url ? `\nPost URL: ${opp.item.source_url}` : ''}`,
    model: 'claude-sonnet-4-6',
    maxTokens: 1024,
  })

  await supabase
    .from('conversation_opportunities')
    .update({ status: 'drafted' })
    .eq('id', body.opportunityId)
    .eq('workspace_id', session.workspaceId)
    .eq('status', 'active')

  const result = await insertConversationResponse({
    workspaceId: session.workspaceId,
    opportunityId: body.opportunityId,
    responseType: body.responseType,
    content: aiResult.content,
    model: aiResult.model,
    generationMetadata: {
      promptVersion: 'v1',
      opportunityTitle: opp.title,
      opportunityType: opp.opportunity_type,
      themeId: opp.theme_id ?? null,
      itemTitle: opp.item?.title ?? null,
      inputTokens: aiResult.inputTokens,
      outputTokens: aiResult.outputTokens,
      durationMs: aiResult.durationMs,
    },
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data, { status: 201 })
}
