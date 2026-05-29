import { NextRequest, NextResponse } from 'next/server'
import type { CompetitorSocials } from '@/types/feed'

const TWITTER_BLOCKED = new Set(['intent', 'home', 'login', 'signup', 'explore', 'i', 'share', 'hashtag', 'search'])
const LINKEDIN_BLOCKED = new Set(['login', 'signup', 'feed', 'jobs', 'learning', 'pulse', 'in', 'authwall'])
const INSTAGRAM_BLOCKED = new Set(['p', 'explore', 'reel', 'reels', 'stories', 'tv', 'accounts'])
const FACEBOOK_BLOCKED = new Set(['sharer', 'dialog', 'login', 'signup', 'photo', 'video', 'share'])

function extractSiteName(html: string, domain: string): string {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i)
  if (og) return og[1].trim()

  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title) {
    // Strip common suffixes like " | Company Name" → "Company Name"
    const parts = title[1].split(/\s*[\|\-–—]\s*/)
    return (parts.length > 1 ? parts[parts.length - 1] : parts[0]).trim().slice(0, 60)
  }

  // Fall back to domain without TLD
  return domain.replace(/^www\./, '').split('.')[0]
}

function extractSocialLinks(html: string): CompetitorSocials {
  const socials: CompetitorSocials = {}
  const seen = new Set<string>()

  const hrefRegex = /href=["']([^"'\s]+)["']/gi
  let match: RegExpExecArray | null

  while ((match = hrefRegex.exec(html)) !== null) {
    const raw = match[1]
    if (seen.has(raw)) continue
    seen.add(raw)

    try {
      const urlObj = new URL(raw)
      const host = urlObj.hostname.replace(/^www\./, '')
      const parts = urlObj.pathname.split('/').filter(Boolean)
      const slug = parts[0]

      if (!slug) continue

      if ((host === 'twitter.com' || host === 'x.com') && !TWITTER_BLOCKED.has(slug) && !socials.twitter) {
        socials.twitter = `https://twitter.com/${slug}`
      }
      if (host === 'linkedin.com' && parts[0] === 'company' && parts[1] && !LINKEDIN_BLOCKED.has(parts[1]) && !socials.linkedin) {
        socials.linkedin = `https://linkedin.com/company/${parts[1]}`
      }
      if (host === 'instagram.com' && !INSTAGRAM_BLOCKED.has(slug) && !socials.instagram) {
        socials.instagram = `https://instagram.com/${slug}`
      }
      if (host === 'youtube.com' && !socials.youtube) {
        if (parts[0] === 'channel' || parts[0] === 'user' || parts[0]?.startsWith('@')) {
          socials.youtube = raw
        } else if (slug?.startsWith('@')) {
          socials.youtube = raw
        }
      }
      if (host === 'facebook.com' && !FACEBOOK_BLOCKED.has(slug) && !socials.facebook) {
        socials.facebook = `https://facebook.com/${slug}`
      }
    } catch {
      // Not a valid URL
    }
  }

  return socials
}

async function discoverRssUrl(domain: string, html: string): Promise<string | null> {
  // Try <link rel="alternate" type="application/rss+xml"> in HTML
  const rssLink = html.match(/<link[^>]+type=["']application\/(?:rss|atom)\+xml["'][^>]+href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+type=["']application\/(?:rss|atom)\+xml["']/i)
  if (rssLink) {
    const href = rssLink[1]
    if (href.startsWith('http')) return href
    return `https://${domain}${href.startsWith('/') ? '' : '/'}${href}`
  }

  // Try common paths
  const paths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/atom.xml', '/blog/feed', '/blog/rss', '/feed/posts/default']
  for (const path of paths) {
    try {
      const res = await fetch(`https://${domain}${path}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0)' },
        signal: AbortSignal.timeout(3000),
        redirect: 'follow',
      })
      const ct = res.headers.get('content-type') ?? ''
      if (res.ok && (ct.includes('xml') || ct.includes('rss') || ct.includes('atom'))) {
        return `https://${domain}${path}`
      }
    } catch {
      // Try next path
    }
  }

  return null
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url')
  if (!rawUrl) return NextResponse.json({ error: 'url required' }, { status: 400 })

  const domain = rawUrl.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()

  try {
    const res = await fetch(`https://${domain}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CloutBot/1.0; +https://clout.so)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
      redirect: 'follow',
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ name: domain, domain, socials: {}, rss_url: null })
    }

    // Limit to first 200KB to avoid memory pressure on large pages
    const buf = await res.arrayBuffer()
    const html = new TextDecoder().decode(buf.slice(0, 200_000))

    const name = extractSiteName(html, domain)
    const socials = extractSocialLinks(html)
    const rss_url = await discoverRssUrl(domain, html)

    return NextResponse.json({ name, domain, socials, rss_url })
  } catch {
    return NextResponse.json({ name: domain, domain, socials: {}, rss_url: null })
  }
}
