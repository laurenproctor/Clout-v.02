import { contentHash } from './hash'
import type { ConversationProvider, NormalizedItem } from './types'

const REDDIT_UA = 'Clout:ConversationMonitor:1.0 (by /u/CloutApp)'

const MAX_POSTS_FOR_COMMENTS = 5
const MAX_COMMENTS_PER_POST  = 10
const MIN_POST_SCORE         = 5
const MIN_POST_COMMENTS      = 2
const MIN_COMMENT_SCORE      = 3
const FETCH_TIMEOUT_MS       = 10_000
const MAX_BODY_CHARS         = 20_000

const BOT_ACCOUNTS = new Set([
  'AutoModerator', 'RemindMeBot', 'SaveVideo', 'sneakpeek_bot',
])

const DELETED_SENTINELS = new Set(['[deleted]', '[removed]'])

// ─── Reddit API shapes ─────────────────────────────────────────────────────

interface RedditPost {
  id: string
  name: string
  title: string
  selftext: string
  url: string
  permalink: string
  author: string
  subreddit: string
  score: number
  upvote_ratio: number
  num_comments: number
  created_utc: number
  is_self: boolean
  link_flair_text: string | null
  thumbnail: string | null
}

interface RedditComment {
  id: string
  body: string
  author: string
  score: number
  created_utc: number
  permalink: string
}

interface RedditListingChild<T> { kind: string; data: T }
interface RedditListing<T> { kind: 'Listing'; data: { children: RedditListingChild<T>[] } }

// ─── URL helpers ───────────────────────────────────────────────────────────

type RedditFetchMode = 'subreddit' | 'search' | 'subreddit_search'

function normalizedUrl(raw: string): URL {
  const u = new URL(raw)
  u.hostname = 'www.reddit.com'
  return u
}

function detectMode(url: URL): RedditFetchMode {
  if (url.pathname.includes('/search')) {
    return url.pathname.startsWith('/r/') ? 'subreddit_search' : 'search'
  }
  return 'subreddit'
}

function buildApiUrl(sourceUrl: string): string {
  const url   = normalizedUrl(sourceUrl)
  const mode  = detectMode(url)
  const q     = url.searchParams.get('q') ?? ''

  if (mode === 'search') {
    return `https://www.reddit.com/search.json?q=${encodeURIComponent(q)}&sort=new&limit=25`
  }

  const subMatch = url.pathname.match(/^\/r\/([^/]+)/)
  const sub      = subMatch?.[1] ?? ''

  if (mode === 'subreddit_search') {
    return `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(q)}&sort=new&limit=25&restrict_sr=true`
  }

  return `https://www.reddit.com/r/${sub}.json?sort=hot&limit=25`
}

// ─── Auth ──────────────────────────────────────────────────────────────────

async function fetchOAuthToken(): Promise<string> {
  const clientId     = process.env.REDDIT_CLIENT_ID!
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!
  const credentials  = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch('https://www.reddit.com/api/v1/access_token', {
      method:  'POST',
      headers: {
        Authorization:  `Basic ${credentials}`,
        'User-Agent':   REDDIT_UA,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:   'grant_type=client_credentials',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Reddit OAuth failed: HTTP ${res.status}`)
    const json = await res.json() as { access_token: string }
    return json.access_token
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Fetch helper with timeout ─────────────────────────────────────────────

async function redditFetch(url: string, headers: Record<string, string>): Promise<Response> {
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, { headers, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

// ─── Item mappers ──────────────────────────────────────────────────────────

function mapPost(post: RedditPost): NormalizedItem {
  const canonical = `https://www.reddit.com${post.permalink}`
  const now       = new Date().toISOString()

  let bodyMarkdown: string | null
  if (post.is_self) {
    const text = post.selftext
    bodyMarkdown = !text || DELETED_SENTINELS.has(text)
      ? null
      : text.slice(0, MAX_BODY_CHARS)
  } else {
    bodyMarkdown = `**[Link Post]** ${post.title}\n\nLinked URL: ${post.url}`.slice(0, MAX_BODY_CHARS)
  }

  const heroImage = (post.thumbnail && post.thumbnail.startsWith('https://'))
    ? post.thumbnail
    : null

  const publication = `r/${post.subreddit}`

  return {
    externalId:   post.id,
    contentHash:  contentHash(canonical),
    canonicalUrl: canonical,
    contentType:  'post' as const,
    title:        post.title ?? null,
    author:       post.author ?? null,
    authorUrl:    `https://www.reddit.com/user/${post.author}`,
    publication,
    sourceUrl:    canonical,
    excerpt:      (bodyMarkdown ?? post.title ?? '').slice(0, 300) || null,
    bodyMarkdown,
    heroImage,
    publishedAt:  new Date(post.created_utc * 1000).toISOString(),
    metadata: {
      redditId:        post.id,
      subreddit:       post.subreddit,
      score:           post.score,
      upvoteRatio:     post.upvote_ratio,
      numComments:     post.num_comments,
      isLinkPost:      !post.is_self,
      flairText:       post.link_flair_text ?? null,
      permalink:       post.permalink,
      author:          post.author,
      engagementScore: post.score + post.num_comments * 3,
      firstSeenAt:     now,
      ingestedAt:      now,
    },
  } satisfies NormalizedItem
}

function mapComment(comment: RedditComment, post: RedditPost): NormalizedItem {
  const canonical = `https://www.reddit.com${post.permalink}${comment.id}/`
  const now       = new Date().toISOString()
  const publication = `r/${post.subreddit}`

  const body = comment.body && !DELETED_SENTINELS.has(comment.body)
    ? comment.body.slice(0, MAX_BODY_CHARS)
    : null

  return {
    externalId:   `${post.id}_c_${comment.id}`,
    contentHash:  contentHash(canonical),
    canonicalUrl: canonical,
    contentType:  'comment' as const,
    title:        null,
    author:       comment.author ?? null,
    authorUrl:    `https://www.reddit.com/user/${comment.author}`,
    publication,
    sourceUrl:    canonical,
    excerpt:      body?.slice(0, 300) ?? null,
    bodyMarkdown: body,
    heroImage:    null,
    publishedAt:  new Date(comment.created_utc * 1000).toISOString(),
    metadata: {
      redditId:         comment.id,
      commentId:        comment.id,
      subreddit:        post.subreddit,
      score:            comment.score,
      isComment:        true,
      parentPostId:     post.id,
      parentPostTitle:  post.title,
      parentPostUrl:    `https://www.reddit.com${post.permalink}`,
      parentPostExcerpt: post.selftext?.slice(0, 200) ?? null,
      permalink:        comment.permalink,
      author:           comment.author,
      firstSeenAt:      now,
      ingestedAt:       now,
    },
  } satisfies NormalizedItem
}

// ─── Provider ─────────────────────────────────────────────────────────────

export class RedditProvider implements ConversationProvider {
  sourceType = 'reddit' as const

  private get hasOAuthCreds(): boolean {
    return Boolean(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET)
  }

  canHandle(url: string): boolean {
    try {
      const { hostname } = new URL(url)
      return hostname === 'reddit.com'
        || hostname === 'www.reddit.com'
        || hostname === 'old.reddit.com'
    } catch {
      return false
    }
  }

  async fetch(sourceUrl: string): Promise<NormalizedItem[]> {
    const apiUrl = buildApiUrl(sourceUrl)
    const mode   = detectMode(normalizedUrl(sourceUrl))

    let headers: Record<string, string> = { 'User-Agent': REDDIT_UA }
    let targetUrl = apiUrl

    if (this.hasOAuthCreds) {
      const token = await fetchOAuthToken()
      headers = { Authorization: `Bearer ${token}`, 'User-Agent': REDDIT_UA }
      targetUrl = apiUrl.replace('www.reddit.com', 'oauth.reddit.com')
    }

    const res = await redditFetch(targetUrl, headers)

    if (res.status === 429) throw new Error(`[RedditProvider] rate limited: ${sourceUrl}`)
    if (!res.ok)            throw new Error(`[RedditProvider] HTTP ${res.status}: ${targetUrl}`)

    const json     = await res.json() as RedditListing<RedditPost>
    const children = json?.data?.children ?? []

    const posts = children
      .filter(c => c.kind === 't3')
      .map(c => c.data)
      .filter(p =>
        !DELETED_SENTINELS.has(p.author) &&
        p.score >= MIN_POST_SCORE &&
        p.num_comments >= MIN_POST_COMMENTS
      )

    const items: NormalizedItem[] = posts.map(mapPost)

    // Fetch comments for top qualifying posts
    const topPosts = [...posts]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_POSTS_FOR_COMMENTS)

    let commentsTotal = 0

    for (const post of topPosts) {
      try {
        const commentUrl = `https://www.reddit.com/r/${post.subreddit}/comments/${post.id}.json`
        const commentTarget = this.hasOAuthCreds
          ? commentUrl.replace('www.reddit.com', 'oauth.reddit.com')
          : commentUrl

        const commentRes = await redditFetch(commentTarget, headers)
        if (!commentRes.ok) continue

        // Response is [postListing, commentListing]
        const commentJson = await commentRes.json() as [unknown, RedditListing<RedditComment>]
        const commentChildren = commentJson[1]?.data?.children ?? []

        const qualifyingComments = commentChildren
          .filter(c => c.kind === 't1')
          .map(c => c.data)
          .filter(c =>
            c.score > MIN_COMMENT_SCORE &&
            !DELETED_SENTINELS.has(c.author) &&
            !BOT_ACCOUNTS.has(c.author) &&
            !DELETED_SENTINELS.has(c.body)
          )
          .slice(0, MAX_COMMENTS_PER_POST)

        for (const comment of qualifyingComments) {
          items.push(mapComment(comment, post))
          commentsTotal++
        }
      } catch (err) {
        console.warn(`[RedditProvider] comment fetch failed for post ${post.id}:`, err)
      }
    }

    console.info('[RedditProvider]', {
      sourceUrl,
      mode,
      postsTotal:     children.length,
      postsQualified: posts.length,
      commentsTotal,
    })

    return items
  }
}
