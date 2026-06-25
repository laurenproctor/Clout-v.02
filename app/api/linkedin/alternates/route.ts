import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { runLinkedInAlternates } from '@/lib/linkedin/runGeneration'
import { scrapeUrl } from '@/lib/scraper'
import type { LinkedInGenerationRequest } from '@/lib/linkedin/types'
import { getCampaignContext } from '@/lib/domain/campaign'

export const maxDuration = 120

// On-demand "Show alternate angles": same brief as the anchor generation, plus
// the already-shown anchor body so the two results are genuinely distinct.
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 })
  }
  const request = (body as { request?: unknown }).request as LinkedInGenerationRequest
  const anchorBody = (body as { anchorBody?: unknown }).anchorBody

  if (!request?.postType || !request?.sourceContent || !request?.intent || !request?.audience) {
    return new Response(
      JSON.stringify({ error: 'postType, sourceContent, intent, and audience are required' }),
      { status: 400 }
    )
  }
  if (typeof anchorBody !== 'string' || !anchorBody.trim()) {
    return new Response(JSON.stringify({ error: 'anchorBody is required' }), { status: 400 })
  }

  function looksLikeUrl(s: string): boolean {
    try { return /^https?:\/\//i.test(s.trim()) && Boolean(new URL(s.trim())) }
    catch { return false }
  }

  if (request.sourceType === 'url' || looksLikeUrl(request.sourceContent)) {
    const rawUrl = request.sourceContent.trim()
    try {
      const article = await scrapeUrl(rawUrl)
      const scraped = [
        article.title      ? `# ${article.title}`                     : '',
        article.author     ? `By ${article.author}`                    : '',
        article.siteName   ? `Source: ${article.siteName}`             : '',
        article.excerpt    ? `\n${article.excerpt}`                    : '',
        article.markdownContent ? `\n${article.markdownContent.slice(0, 6000)}` : '',
      ].filter(Boolean).join('\n')

      request.sourceContent = scraped || rawUrl
      request.sourceUrl = rawUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[linkedin/alternates] URL scrape failed, proceeding with URL as context:', msg)
      request.sourceContent = `Source URL: ${rawUrl}\n\n(Full content could not be retrieved — base the post on what this URL likely covers based on context clues.)`
      request.sourceUrl = rawUrl
    }
  }

  const [lensesResult, brandContext] = await Promise.all([
    listLenses({ workspaceId: session.workspaceId }),
    getBrandContext(),
  ])
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map((l) => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const campaignId = (body as { campaignId?: string }).campaignId ?? null
  let campaignContext: { goal: string; purpose: string } | null = null
  if (campaignId) {
    campaignContext = await getCampaignContext(campaignId, session.workspaceId)
    if (!campaignContext) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404 })
    }
  }

  const ctx = { request, lenses: resolvedLenses, brandContext, campaignContext }
  const stream = runLinkedInAlternates(ctx, anchorBody)

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
