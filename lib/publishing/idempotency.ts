import { createHash } from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import type { CanonicalArticle } from './canonical/types'
import type { PublishingProviderId, PublishedContent } from './types'

export function computeContentHash(article: CanonicalArticle): string {
  const data = JSON.stringify({ title: article.title, body: article.body })
  return createHash('sha256').update(data).digest('hex').slice(0, 16)
}

export function generateIdempotencyKey(params: {
  workspaceId: string
  canonicalContentId: string
  provider: PublishingProviderId
  connectionId: string
  // Optional action discriminator. Kept optional + appended only when present so existing
  // single-action providers (WordPress/Medium/Shopify) keep byte-identical keys. For
  // Substack it MUST be supplied so a draft, web publish, and subscriber email never
  // collapse into the same dedupe key.
  intendedAction?: string
}): string {
  const base = `${params.workspaceId}:${params.canonicalContentId}:${params.provider}:${params.connectionId}`
  const data = params.intendedAction ? `${base}:${params.intendedAction}` : base
  return createHash('sha256').update(data).digest('hex').slice(0, 32)
}

// Returns existing published_content row if this idempotency key was already used.
export async function findExistingPublish(
  idempotencyKey: string,
): Promise<PublishedContent | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data } = await supabase
    .from('published_content')
    .select()
    .eq('idempotency_key', idempotencyKey)
    .in('status', ['processing', 'published'])
    .maybeSingle()

  if (!data) return null

  return {
    id:                      data.id,
    workspaceId:             data.workspace_id,
    userId:                  data.user_id,
    connectionId:            data.connection_id ?? null,
    provider:                data.provider as PublishingProviderId,
    providerContentId:       data.provider_content_id ?? null,
    providerUrl:             data.provider_url ?? null,
    title:                   data.title,
    slug:                    data.slug ?? null,
    status:                  data.status as PublishedContent['status'],
    sourceType:              data.source_type as 'blog' | 'manual',
    sourceId:                data.source_id ?? null,
    canonicalContentId:      data.canonical_content_id ?? null,
    idempotencyKey:          data.idempotency_key ?? null,
    contentHash:             data.content_hash ?? null,
    providerMetadataVersion: data.provider_metadata_version,
    metadata:                (data.metadata as Record<string, unknown>) ?? {},
    publishedAt:             data.published_at ?? null,
    createdAt:               data.created_at,
    updatedAt:               data.updated_at,
  }
}
