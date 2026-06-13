import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOutput, updateOutput } from '@/lib/domain/output'
import { markPublished } from '@/lib/domain/publishing'
import { publishSubstackOutput, SubstackManualFallbackError } from '@/lib/domain/substack-publish'
import type { PublishIntent } from '@/types/domain'

const VALID_INTENTS: ReadonlySet<string> = new Set<PublishIntent>([
  'substack_newsletter_draft',
  'substack_note_publish',
  'substack_newsletter_publish_web',
  'substack_newsletter_send_email',
])

// Publishes a single Substack output through the publishing-layer bridge. Persists the
// chosen destination + intent first so the scheduler and idempotency see the same state,
// then runs the bridge. A blocked/fail-closed action returns 200 with the manual-fallback
// product state (never an error dead-end). Intent is never silently downgraded.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const existing = await getOutput(id)
  if (!existing.ok || existing.data.workspaceId !== session.workspaceId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json().catch(() => ({})) as {
    connectionId?: string
    intent?: string
  }
  const connectionId = body.connectionId ?? existing.data.publishingConnectionId
  const intent = body.intent ?? existing.data.publishIntent ?? 'substack_newsletter_draft'

  if (!connectionId) {
    return NextResponse.json({ error: 'Select a Substack publication first.' }, { status: 400 })
  }
  if (!VALID_INTENTS.has(intent)) {
    return NextResponse.json({ error: 'Invalid Substack action.' }, { status: 400 })
  }

  // Persist destination + intent so the bridge, scheduler, and idempotency key agree.
  const updated = await updateOutput({
    outputId: id,
    publishingConnectionId: connectionId,
    publishIntent: intent as PublishIntent,
  })
  if (!updated.ok) return NextResponse.json({ error: updated.error }, { status: 500 })

  try {
    const result = await publishSubstackOutput(updated.data)
    await markPublished(id, result.postUrn, result.postUrl || undefined)
    return NextResponse.json({ ok: true, providerPostUrl: result.postUrl, providerPostId: result.postUrn })
  } catch (err) {
    if (err instanceof SubstackManualFallbackError) {
      // Friendly product state — surface the fallback, do not mark published or 500.
      // err.fallback is { ok: false, status, reason, fallback: {...} }.
      return NextResponse.json(err.fallback, { status: 200 })
    }
    const message = err instanceof Error ? err.message : 'Substack publish failed.'
    await updateOutput({ outputId: id, status: 'failed', lastPublishError: message })
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
