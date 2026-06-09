import { fetchSubstackApiList } from '@/lib/scraper/substack'
import type { SubstackApiListPost } from '@/lib/scraper/substack'
import { scrapeBlog } from '@/lib/competitors/scrapers/blog'
import { toMarkdown } from '@/lib/scraper/markdown'
import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

const MAX_BODY_CHARS = 20_000

function getBylinePublication(post: SubstackApiListPost) {
  const byline = post.publishedBylines?.[0]
  const users = byline?.publicationUsers ?? []
  const primary = users.find(u => u.is_primary) ?? users[0]
  return primary?.publication ?? null
}

export class SubstackProvider implements ConversationProvider {
  sourceType = 'substack' as const

  canHandle(url: string): boolean {
    try { return new URL(url).hostname.endsWith('.substack.com') } catch { return false }
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const { hostname, origin } = new URL(sourceUrl)

    // Tier 1: Substack API
    const apiPosts = await fetchSubstackApiList(origin)
    if (apiPosts.length > 0) {
      return apiPosts
        .filter(p => p.audience !== 'only_paid')
        .slice(0, 15)
        .map(p => {
          const canonical = p.canonical_url ?? `${origin}/p/${p.slug}`
          const pub = getBylinePublication(p)
          const author = (p.publishedBylines ?? [])
            .map(b => b.name)
            .filter(Boolean)
            .join(', ') || null
          const publication = pub?.name ?? hostname.replace(/\.substack\.com$/, '')
          const rawBody = p.body_html ? toMarkdown(p.body_html) : null
          const bodyMarkdown = rawBody ? rawBody.slice(0, MAX_BODY_CHARS) : null
          const reactionCount = p.reaction_count ?? 0
          const commentCount = p.comment_count ?? 0

          return {
            externalId: p.slug ?? String(p.id),
            contentHash: contentHash(canonical),
            canonicalUrl: canonical,
            contentType: 'article' as const,
            title: p.title ?? null,
            author,
            authorUrl: null,
            publication,
            sourceUrl: canonical,
            excerpt: p.description ?? p.subtitle ?? p.truncated_body_text?.slice(0, 300) ?? null,
            bodyMarkdown,
            heroImage: p.cover_image ?? null,
            publishedAt: p.post_date ?? null,
            metadata: {
              hostname,
              apiV1: true,
              reactionCount,
              commentCount,
              engagementScore: reactionCount + commentCount * 3,
              publicationName: pub?.name ?? null,
              publicationLogo: pub?.logo_url ?? null,
            },
          } satisfies NormalizedItem
        })
    }

    // Tier 2: RSS fallback
    const rssUrl = `${origin}/feed`
    const rssPosts = await scrapeBlog(hostname, rssUrl, { maxPosts: 15 }).catch(() => [])
    if (rssPosts.length > 0) {
      return rssPosts.map(p => {
        const canonical = p.url
        const isNote = canonical.includes('/note/') || canonical.includes('/notes/')
        return {
          externalId: p.external_id,
          contentHash: contentHash(canonical),
          canonicalUrl: canonical,
          contentType: isNote ? ('note' as const) : ('article' as const),
          title: p.title ?? null,
          author: null,
          authorUrl: null,
          publication: hostname.replace(/\.substack\.com$/, ''),
          sourceUrl: canonical,
          excerpt: p.content.slice(0, 300) || null,
          bodyMarkdown: p.content.slice(0, MAX_BODY_CHARS) || null,
          heroImage: null,
          publishedAt: p.published_at,
          metadata: { hostname, rssFallback: true },
        } satisfies NormalizedItem
      })
    }

    // Tier 3: nothing retrievable
    return []
  }
}
