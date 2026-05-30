import type { RawPost, ScraperOpts } from './types'
import { urlParts } from './types'

function parseCompanySlug(url: string): string | null {
  const parts = urlParts(url)
  return parts[0] === 'company' && parts[1] ? parts[1] : null
}

async function getCsrfToken(liAt: string): Promise<string> {
  try {
    const res = await fetch('https://www.linkedin.com/feed/', {
      headers: { Cookie: `li_at=${liAt}`, 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      redirect: 'follow',
      signal:   AbortSignal.timeout(8000),
    })
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const m = c.match(/JSESSIONID="?ajax:([^";]+)"?/)
      if (m) return `ajax:${m[1]}`
    }
  } catch { /* fall through */ }
  return 'ajax:0685672062'
}

function voyagerHeaders(liAt: string, csrf: string) {
  return {
    Cookie:                       `li_at=${liAt}; JSESSIONID="${csrf}"`,
    'csrf-token':                 csrf,
    'x-restli-protocol-version': '2.0.0',
    'x-li-lang':                 'en_US',
    'User-Agent':                 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    Accept:                       'application/vnd.linkedin.normalized+json+2.1',
  }
}

async function resolveCompanyId(slug: string, liAt: string, csrf: string): Promise<string | null> {
  const res = await fetch(
    `https://www.linkedin.com/voyager/api/organization/companies?q=universalName&universalName=${encodeURIComponent(slug)}`,
    { headers: voyagerHeaders(liAt, csrf), signal: AbortSignal.timeout(8000) }
  )
  if (!res.ok) return null
  const d = await res.json()
  const entity = d?.elements?.[0] ?? d?.included?.[0]
  const urn: string = entity?.entityUrn ?? ''
  return urn.match(/urn:li:company:(\d+)/)?.[1] ?? null
}

interface VoyagerUpdate {
  updateContent?: { companyStatusUpdate?: { updateV2?: { text?: { text?: string }; media?: { thumbnail?: { url?: string } } } } }
  socialDetail?: { likes?: { paging?: { total?: number } }; comments?: { paging?: { total?: number } } }
  created?: { time?: number }
  permalink?: string
}

export async function scrapeLinkedIn(companyUrl: string, opts: ScraperOpts = {}): Promise<RawPost[]> {
  const liAt = process.env.LINKEDIN_LI_AT
  if (!liAt) { console.warn('[linkedin] LINKEDIN_LI_AT not set'); return [] }

  const slug = parseCompanySlug(companyUrl)
  if (!slug) return []

  const csrf      = await getCsrfToken(liAt)
  const companyId = await resolveCompanyId(slug, liAt, csrf)
  if (!companyId) { console.warn(`[linkedin] Could not resolve company ID for ${slug}`); return [] }

  const count = opts.maxPosts ?? 10
  const res = await fetch(
    `https://www.linkedin.com/voyager/api/feed/updatesV2?companyId=${companyId}&q=companyFeedByUniversalName&count=${count}&start=0`,
    { headers: voyagerHeaders(liAt, csrf), signal: AbortSignal.timeout(10000) }
  )
  if (!res.ok) { console.warn(`[linkedin] Feed ${res.status} for ${slug}`); return [] }

  const updates: VoyagerUpdate[] = (await res.json())?.elements ?? []

  return updates.slice(0, count).map((u, i) => {
    const text = u.updateContent?.companyStatusUpdate?.updateV2?.text?.text ?? ''
    const time = u.created?.time
    return {
      external_id:   u.permalink ?? `${companyId}-${i}-${time ?? Date.now()}`,
      content:       text.slice(0, 500),
      url:           u.permalink ?? `https://www.linkedin.com/company/${slug}/posts/`,
      thumbnail_url: u.updateContent?.companyStatusUpdate?.updateV2?.media?.thumbnail?.url,
      published_at:  time ? new Date(time).toISOString() : new Date().toISOString(),
      metrics: {
        likes:    u.socialDetail?.likes?.paging?.total    ?? undefined,
        comments: u.socialDetail?.comments?.paging?.total ?? undefined,
      },
    }
  }).filter(p => p.content.length > 0)
}
