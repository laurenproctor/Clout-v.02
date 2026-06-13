import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem, ProviderFetchContext } from './types'
import { evaluateUnipileMonitoring } from '@/lib/unipile/gates'
import { getUnipileConnection } from '@/lib/unipile/connection'
import { searchPosts, type UnipilePost } from '@/lib/unipile/client'
import { UNIPILE_LIMITS } from '@/lib/unipile/ratelimit'

// LinkedIn keyword monitoring via the Unipile beta connector. READ-ONLY: this provider
// only searches and ingests posts — it performs no outbound LinkedIn action and never
// touches the Jina-based LinkedInProvider. Selected for keyword sources whose provider
// is 'linkedin' (see providers/index.ts); source URLs look like `linkedin://search?q=…`.

const DATE_POSTED   = 'past_week'
const MIN_REACTIONS = 2
const MAX_ITEMS     = UNIPILE_LIMITS.maxItemsPerRun
const MAX_BODY_CHARS = 20_000

function keywordFromUrl(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).searchParams.get('q') ?? ''
  } catch {
    return ''
  }
}

function firstLine(text: string | undefined): string | null {
  if (!text) return null
  const line = text.split('\n').map(s => s.trim()).find(Boolean)
  if (!line) return null
  return line.length > 120 ? `${line.slice(0, 117)}…` : line
}

function mapPost(post: UnipilePost): NormalizedItem {
  const now = new Date().toISOString()
  const text = (post.text ?? '').slice(0, MAX_BODY_CHARS)
  const sourceUrl = post.share_url ?? `https://www.linkedin.com/feed/update/${post.social_id}`
  const reactionCount = post.reaction_counter ?? 0
  const commentCount = post.comment_counter ?? 0
  const publicId = post.author?.public_identifier

  return {
    externalId:       post.social_id ?? post.id,
    contentHash:      post.share_url ? contentHash(post.share_url) : null,
    canonicalUrl:     post.share_url ?? null,
    contentType:      'post' as const,
    title:            firstLine(post.text) ?? post.author?.name ?? null,
    author:           post.author?.name ?? null,
    authorUrl:        publicId ? `https://www.linkedin.com/in/${publicId}` : null,
    publication:      post.author?.headline ?? null,
    sourceUrl,
    excerpt:          text.slice(0, 300) || null,
    bodyMarkdown:     text || null,
    heroImage:        null,
    publishedAt:      post.parsed_datetime ?? null,
    provider:         'linkedin',
    providerItemId:   post.id,
    providerSocialId: post.social_id ?? null,
    providerUrl:      post.share_url ?? null,
    providerMetadata: { authorPublicIdentifier: publicId ?? null },
    metadata: {
      source:          'unipile',
      socialId:        post.social_id,
      authorHeadline:  post.author?.headline ?? null,
      reactionCount,
      commentCount,
      engagementScore: reactionCount + commentCount * 3,
      firstSeenAt:     now,
      ingestedAt:      now,
    },
  } satisfies NormalizedItem
}

export class LinkedInUnipileProvider implements ConversationProvider {
  sourceType = 'linkedin' as const

  canHandle(url: string): boolean {
    try {
      const u = new URL(url)
      return u.protocol === 'linkedin:' && u.host === 'search'
    } catch {
      return false
    }
  }

  async fetch(sourceUrl: string, ctx?: ProviderFetchContext): Promise<NormalizedItem[]> {
    const workspaceId = ctx?.workspaceId
    if (!workspaceId) throw new Error('[LinkedInUnipileProvider] missing workspace context')

    // Gate: master flag + kill switch + workspace monitoring beta + live connection.
    // Throwing here surfaces a setup-required/error state via markSourceError — and
    // crucially never falls back to scraping.
    const gate = await evaluateUnipileMonitoring({ workspaceId })
    if (!gate.allowed) throw new Error(`[LinkedInUnipileProvider] ${gate.reason}: ${gate.message}`)

    const connection = await getUnipileConnection(workspaceId)
    if (!connection) throw new Error('[LinkedInUnipileProvider] no connected account')

    const keyword = keywordFromUrl(sourceUrl)
    if (!keyword) return []

    const posts = await searchPosts(connection.accountId, keyword, {
      datePosted: DATE_POSTED,
      limit: MAX_ITEMS,
    })

    const items = posts
      .filter(p => (p.reaction_counter ?? 0) + (p.comment_counter ?? 0) >= MIN_REACTIONS)
      .slice(0, MAX_ITEMS)
      .map(mapPost)

    console.info('[LinkedInUnipileProvider]', {
      workspaceId,
      keyword,
      postsTotal: posts.length,
      postsQualified: items.length,
    })

    return items
  }
}
