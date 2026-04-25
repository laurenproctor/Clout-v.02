import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getCapture } from '@/lib/domain/capture'
import { researchTopic } from '@/lib/ai/research'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: captureId } = await params

  const captureResult = await getCapture(captureId)
  if (!captureResult.ok) return NextResponse.json({ error: 'Capture not found' }, { status: 404 })

  const capture = captureResult.data
  if (capture.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const topic = capture.rawContent?.trim()
  if (!topic) return NextResponse.json({ error: 'Capture has no content' }, { status: 400 })

  let sources: import('@/types/domain').ResearchSource[] = []
  let summary = ''
  let researchFailed = false

  try {
    const result = await researchTopic(topic)
    sources = result.sources
    summary = result.summary
  } catch (err) {
    console.warn('[api/research] research failed, continuing without it', err)
    researchFailed = true
  }

  // Persist research to capture even if empty (marks research as attempted)
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from('captures') as any)
    .update({
      research_sources: sources.length > 0 ? sources : null,
      research_summary: summary || null,
      status: 'ready',
      updated_at: new Date().toISOString(),
    })
    .eq('id', captureId)

  return NextResponse.json({
    sources,
    summary,
    research_failed: researchFailed,
  })
}
