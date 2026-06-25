import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { getOutput } from '@/lib/domain/output'
import {
  publishOutput,
  acquirePublishLock,
  markPublished,
  markFailed,
} from '@/lib/domain/publishing'

// Narrow insert surface: the lineage column source_output_id is not yet in the
// generated `outputs` Insert type, so the typed client rejects it.
interface UntypedInsertQuery extends PromiseLike<{ data: { id: string } | null; error: { message: string } | null }> {
  insert(values: Record<string, unknown>): UntypedInsertQuery
  select(columns: string): UntypedInsertQuery
  single(): UntypedInsertQuery
}
interface UntypedInsertClient {
  from(table: string): UntypedInsertQuery
}

const PLATFORM_CONTENT_TYPE: Record<string, string> = {
  linkedin: 'linkedin',
  threads:  'threads',
  bluesky:  'bluesky',
  x:        'twitter',
  twitter:  'twitter',
  mastodon: 'mastodon',
}

const bodySchema = z.object({
  noteOutputId: z.string().uuid(),
  platform:     z.enum(['linkedin', 'threads', 'bluesky', 'x', 'twitter', 'mastodon']),
  channelId:    z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let rawBody: unknown
  try { rawBody = await req.json() }
  catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { noteOutputId, platform, channelId } = parsed.data

  // Load source note output
  const noteResult = await getOutput(noteOutputId)
  if (!noteResult.ok || noteResult.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Note output not found' }, { status: 404 })
  }
  const noteBody = noteResult.data.content.body
  if (!noteBody) {
    return NextResponse.json({ error: 'Note has no body text' }, { status: 422 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // Verify channelId belongs to this workspace
  const { data: channelRow } = await supabase
    .from('channels')
    .select('id, workspace_id')
    .eq('id', channelId)
    .eq('workspace_id', session.workspaceId)
    .single()

  if (!channelRow) {
    return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
  }

  // Insert derived output with lineage
  const { data: newRow, error: insertError } = await (supabase as unknown as UntypedInsertClient)
    .from('outputs')
    .insert({
      workspace_id:     session.workspaceId,
      channel_id:       channelId,
      status:           'draft',
      content_type:     PLATFORM_CONTENT_TYPE[platform],
      content:          { body: noteBody },
      source_output_id: noteOutputId,
      created_at:       now,
      updated_at:       now,
    })
    .select('id')
    .single()

  if (insertError || !newRow) {
    return NextResponse.json(
      { error: insertError?.message ?? 'Failed to create output' },
      { status: 500 }
    )
  }

  const newOutputId = (newRow as { id: string }).id

  const lock = await acquirePublishLock(newOutputId)
  if (!lock.ok) {
    return NextResponse.json(
      { error: 'Publish already in progress', code: 'publish_in_progress' },
      { status: 409 }
    )
  }

  // Load typed Output object for publishOutput()
  const outputResult = await getOutput(newOutputId)
  if (!outputResult.ok) {
    return NextResponse.json({ error: 'Failed to load output for publishing' }, { status: 500 })
  }

  try {
    const { postUrn, postUrl } = await publishOutput(outputResult.data)
    await markPublished(newOutputId, postUrn, postUrl)
    return NextResponse.json({ ok: true, outputId: newOutputId, postUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Publish failed'
    const code = (err as { code?: string }).code ?? 'unknown'
    await markFailed(newOutputId, message)
    const httpStatus = code === 'token_expired' ? 401 : 502
    return NextResponse.json({ error: message, code }, { status: httpStatus })
  }
}
