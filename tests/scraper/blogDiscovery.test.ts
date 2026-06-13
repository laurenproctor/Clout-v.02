import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  parseWpPosts,
  parseFeed,
  parseSitemap,
  discoverFeedUrl,
  extractPostLinks,
  isSameSite,
  discoverBlogPosts,
} from '@/lib/scraper/blogDiscovery'

describe('parseWpPosts', () => {
  const json = JSON.stringify([
    { link: 'https://somafina.com/post-a/', title: { rendered: 'Post A &amp; More' }, date: '2026-05-01T10:00:00' },
    { link: 'https://somafina.com/post-b/', title: { rendered: 'Post B' }, date: '2026-04-01T10:00:00' },
  ])

  it('maps WordPress REST posts to discovered posts', () => {
    const posts = parseWpPosts(json, 25)
    expect(posts).toEqual([
      { url: 'https://somafina.com/post-a/', title: 'Post A & More', publishedAt: '2026-05-01T10:00:00' },
      { url: 'https://somafina.com/post-b/', title: 'Post B', publishedAt: '2026-04-01T10:00:00' },
    ])
  })

  it('respects the limit', () => {
    expect(parseWpPosts(json, 1)).toHaveLength(1)
  })

  it('returns empty array for non-array or malformed JSON', () => {
    expect(parseWpPosts('not json', 25)).toEqual([])
    expect(parseWpPosts('{"code":"rest_no_route"}', 25)).toEqual([])
    expect(parseWpPosts('[]', 25)).toEqual([])
  })
})

describe('parseFeed', () => {
  it('parses an RSS 2.0 feed', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <title>Blog</title>
      <item><title>First</title><link>https://x.com/first</link><pubDate>Mon, 05 May 2026 10:00:00 +0000</pubDate></item>
      <item><title>Second</title><link>https://x.com/second</link></item>
    </channel></rss>`
    const posts = parseFeed(xml, 25)
    expect(posts.map(p => p.url)).toEqual(['https://x.com/first', 'https://x.com/second'])
    expect(posts[0]!.title).toBe('First')
  })

  it('parses an Atom feed (link href, entry)', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <entry><title>Alpha</title><link href="https://x.com/alpha" rel="alternate"/><updated>2026-05-01T10:00:00Z</updated></entry>
      <entry><title>Beta</title><link href="https://x.com/beta"/></entry>
    </feed>`
    const posts = parseFeed(xml, 25)
    expect(posts.map(p => p.url)).toEqual(['https://x.com/alpha', 'https://x.com/beta'])
    expect(posts[0]!.title).toBe('Alpha')
  })

  it('returns empty for non-feed XML', () => {
    expect(parseFeed('<html><body>nope</body></html>', 25)).toEqual([])
  })
})

describe('parseSitemap', () => {
  it('parses a urlset sitemap', () => {
    const xml = `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <url><loc>https://x.com/one</loc><lastmod>2026-05-01</lastmod></url>
      <url><loc>https://x.com/two</loc></url>
    </urlset>`
    const posts = parseSitemap(xml, 25)
    expect(posts.map(p => p.url)).toEqual(['https://x.com/one', 'https://x.com/two'])
  })

  it('returns empty for a sitemap index (no direct urls)', () => {
    const xml = `<?xml version="1.0"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap><loc>https://x.com/post-sitemap.xml</loc></sitemap>
    </sitemapindex>`
    expect(parseSitemap(xml, 25)).toEqual([])
  })
})

describe('discoverFeedUrl', () => {
  it('finds an RSS autodiscovery link and resolves it absolutely', () => {
    const html = `<html><head>
      <link rel="alternate" type="application/rss+xml" title="Feed" href="/blog/feed/">
    </head></html>`
    expect(discoverFeedUrl(html, 'https://somafina.com/blog')).toBe('https://somafina.com/blog/feed/')
  })

  it('returns null when no feed link present', () => {
    expect(discoverFeedUrl('<html><head></head></html>', 'https://x.com')).toBeNull()
  })
})

describe('extractPostLinks', () => {
  it('extracts same-origin post-like links and skips nav/utility paths', () => {
    const html = `<html><body>
      <nav><a href="/about-us">About</a><a href="/contact-us">Contact</a></nav>
      <a href="/category/news">Category</a>
      <a href="/the-collagen-supplement-opportunity-is-evolving">Post 1</a>
      <a href="/fat-soluble-vs-water-soluble-vitamins">Post 2</a>
      <a href="https://twitter.com/x">External</a>
      <a href="/supplement-source/2/">Page 2</a>
      <a href="/wp-json/wp/v2/posts">api</a>
    </body></html>`
    const posts = extractPostLinks(html, 'https://somafina.com/supplement-source', 25)
    const urls = posts.map(p => p.url)
    expect(urls).toContain('https://somafina.com/the-collagen-supplement-opportunity-is-evolving')
    expect(urls).toContain('https://somafina.com/fat-soluble-vs-water-soluble-vitamins')
    expect(urls).not.toContain('https://twitter.com/x')
    expect(urls.some(u => u.includes('/category/'))).toBe(false)
    expect(urls.some(u => u.includes('/wp-json'))).toBe(false)
    expect(urls.some(u => u.includes('/supplement-source/2'))).toBe(false)
  })

  it('dedupes repeated links', () => {
    const html = `<body>
      <a href="/my-great-post">x</a>
      <a href="/my-great-post/">y</a>
    </body>`
    const posts = extractPostLinks(html, 'https://x.com/blog', 25)
    expect(posts).toHaveLength(1)
  })
})

describe('isSameSite', () => {
  it('matches the same host', () => {
    expect(isSameSite('https://example.com/post', 'https://example.com/blog')).toBe(true)
  })

  it('treats www and the apex as the same site', () => {
    expect(isSameSite('https://example.com/post', 'https://www.example.com/blog')).toBe(true)
    expect(isSameSite('https://www.example.com/post', 'https://example.com/blog')).toBe(true)
  })

  it('treats subdomains of the same site as same-site (both directions)', () => {
    expect(isSameSite('https://blog.example.com/post', 'https://example.com')).toBe(true)
    expect(isSameSite('https://example.com/post', 'https://blog.example.com')).toBe(true)
    expect(isSameSite('https://blog.example.co.uk/post', 'https://example.co.uk')).toBe(true)
  })

  it('rejects unrelated domains', () => {
    expect(isSameSite('https://medium.com/@x/post', 'https://example.com')).toBe(false)
    expect(isSameSite('https://feeds.feedburner.com/x', 'https://example.com')).toBe(false)
    expect(isSameSite('https://other.co.uk/post', 'https://example.co.uk')).toBe(false)
  })

  it('is not fooled by suffix look-alikes', () => {
    expect(isSameSite('https://notexample.com/post', 'https://example.com')).toBe(false)
    expect(isSameSite('https://evil-example.com/post', 'https://example.com')).toBe(false)
  })

  it('returns false on unparseable input', () => {
    expect(isSameSite('not a url', 'https://example.com')).toBe(false)
    expect(isSameSite('https://example.com', 'garbage')).toBe(false)
  })
})

describe('discoverBlogPosts (same-site filtering)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('keeps only same-site posts when a feed mixes in off-domain links', async () => {
    // The site's feed is an aggregator: some items link back to the user's own
    // domain, others to third-party sites. Only the user's own posts should
    // survive discovery.
    const mixedRss = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Our Post</title><link>https://example.com/our-post</link></item>
      <item><title>Their Post</title><link>https://external-blog.com/their-post</link></item>
      <item><title>Aggregated</title><link>https://medium.com/@someone/x</link></item>
    </channel></rss>`

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const u = String(input)
      if (u.includes('/wp-json')) return { status: 404, text: async () => 'not found' }
      if (u.includes('/feed')) return { status: 200, text: async () => mixedRss }
      if (u === 'https://example.com/blog') return { status: 200, text: async () => '<html><head></head><body></body></html>' }
      return { status: 404, text: async () => '' }
    }))

    const posts = await discoverBlogPosts('https://example.com/blog', 25)
    expect(posts).not.toBeNull()
    expect(posts!.map(p => p.url)).toEqual(['https://example.com/our-post'])
  })

  it('returns null when every discovered post is off-domain', async () => {
    const offSiteRss = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item><title>Their Post</title><link>https://external-blog.com/their-post</link></item>
      <item><title>Aggregated</title><link>https://medium.com/@someone/x</link></item>
    </channel></rss>`

    vi.stubGlobal('fetch', vi.fn(async (input: string) => {
      const u = String(input)
      if (u.includes('/wp-json')) return { status: 404, text: async () => 'not found' }
      if (u.includes('/feed')) return { status: 200, text: async () => offSiteRss }
      if (u.includes('sitemap')) return { status: 404, text: async () => '' }
      if (u === 'https://example.com/blog') return { status: 200, text: async () => '<html><head></head><body></body></html>' }
      return { status: 404, text: async () => '' }
    }))

    const posts = await discoverBlogPosts('https://example.com/blog', 25)
    expect(posts).toBeNull()
  })
})
