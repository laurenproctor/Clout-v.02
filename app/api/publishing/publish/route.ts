import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getConnectionWithToken, createPublishedContentRecord } from '@/lib/publishing/domain'
import { getProvider } from '@/lib/publishing/registry'
import { computeContentHash, generateIdempotencyKey, findExistingPublish } from '@/lib/publishing/idempotency'
import { processPublishAttempt } from '@/lib/publishing/executor'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import type { PublishOptions } from '@/lib/publishing/types'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    connectionId?: string
    article?: CanonicalArticle
    opts?: PublishOptions
    sourceType?: 'blog' | 'manual'
    sourceId?: string
  }

  const { connectionId, article, opts, sourceType = 'manual', sourceId } = body

  if (!connectionId || !article || !opts) {
    return NextResponse.json(
      { error: 'connectionId, article, and opts are required.' },
      { status: 400 }
    )
  }

  const connResult = await getConnectionWithToken(connectionId, session.workspaceId)
  if (!connResult.ok) return NextResponse.json({ error: 'Connection not found.' }, { status: 404 })

  const connection = connResult.data
  const provider   = getProvider(connection.provider)

  // Validate content
  const validation = provider.validateContent(article, opts)
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errors.join(' '), warnings: validation.warnings },
      { status: 422 }
    )
  }

  // Idempotency
  const canonicalContentId = article.id
  const idempotencyKey = generateIdempotencyKey({
    workspaceId: session.workspaceId,
    canonicalContentId,
    provider:    connection.provider,
    connectionId,
  })
  const contentHash = computeContentHash(article)

  const existing = await findExistingPublish(idempotencyKey)
  if (existing?.status === 'published') {
    return NextResponse.json({
      id:               existing.id,
      providerContentId: existing.providerContentId,
      providerUrl:       existing.providerUrl,
      status:            existing.status,
      idempotent:        true,
    })
  }

  // Create record with status: queued
  const recordResult = await createPublishedContentRecord({
    workspaceId:        session.workspaceId,
    userId:             session.userId,
    connectionId,
    provider:           connection.provider,
    title:              opts.overrideTitle ?? article.title,
    slug:               opts.overrideSlug  ?? article.slug,
    sourceType,
    sourceId,
    canonicalContentId,
    idempotencyKey,
    contentHash,
  })

  if (!recordResult.ok) return NextResponse.json({ error: recordResult.error }, { status: 500 })

  // Execute synchronously for v1. Trigger.dev worker replaces this call in v2.
  const result = await processPublishAttempt({
    workspaceId:        session.workspaceId,
    publishedContentId: recordResult.data.id,
    connectionId,
    article,
    opts,
    idempotencyKey,
  })

  if (result.ok) {
    return NextResponse.json({
      id:                recordResult.data.id,
      providerContentId: result.providerContentId,
      providerUrl:       result.providerUrl,
      status:            'published',
      publishAttemptId:  result.publishAttemptId,
    }, { status: 201 })
  }

  return NextResponse.json(
    { error: result.error, id: recordResult.data.id, publishAttemptId: result.publishAttemptId },
    { status: 502 },
  )
}
