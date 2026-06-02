import { NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { ingestWorkspaceTopics } from '@/lib/feed/ingest'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  const { data: ws } = await supabase
    .from('workspace_feed_settings')
    .select('content_topics, services')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle()

  const topics = ws?.content_topics ?? []
  const services = ws?.services ?? []

  if (topics.length === 0 && services.length === 0) {
    return NextResponse.json({ error: 'No topics or services configured. Add them in Signal Feed settings first.' }, { status: 400 })
  }

  // Run ingestion after the response is sent so the button doesn't hang
  after(async () => {
    await ingestWorkspaceTopics({ topics, services })
      .catch(err => console.error('[feed/refresh] ingest failed:', err))
  })

  return NextResponse.json({ success: true, topics: topics.length, services: services.length })
}
