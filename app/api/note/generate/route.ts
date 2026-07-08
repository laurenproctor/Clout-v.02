import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { getCampaignContext } from '@/lib/domain/campaign'
import { runNoteGeneration } from '@/lib/note/runGeneration'
import { scrapeUrl } from '@/lib/scraper'
import type { NoteGenerationRequest } from '@/lib/note/types'

export const maxDuration = 60

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
  const request = (body as { request?: unknown }).request as NoteGenerationRequest

  if (!request?.sourceContent) {
    return new Response(JSON.stringify({ error: 'sourceContent is required' }), { status: 400 })
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
        article.title      ? `# ${article.title}`                          : '',
        article.author     ? `By ${article.author}`                         : '',
        article.siteName   ? `Source: ${article.siteName}`                  : '',
        article.excerpt    ? `\n${article.excerpt}`                         : '',
        article.markdownContent ? `\n${article.markdownContent.slice(0, 4000)}` : '',
      ].filter(Boolean).join('\n')
      request.sourceContent = scraped || rawUrl
      request.sourceUrl = rawUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('[note/generate] URL scrape failed:', msg)
      request.sourceContent = `Source URL: ${rawUrl}\n\n(Content could not be retrieved — base the note on likely context.)`
      request.sourceUrl = rawUrl
    }
  }

  const [lensesResult, brandContext] = await Promise.all([
    listLenses({ workspaceId: session.workspaceId }),
    getBrandContext(),
  ])
  const allLenses    = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map(id => allLenses.find(l => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map(l => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  // If generating for a campaign, validate ownership and load its goal/purpose
  // so the notes are written toward the campaign objective.
  const campaignId = (body as { campaignId?: string }).campaignId ?? null
  let campaignContext: { goal: string; purpose: string } | null = null
  if (campaignId) {
    campaignContext = await getCampaignContext(campaignId, session.workspaceId)
    if (!campaignContext) {
      return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404 })
    }
  }

  const stream = runNoteGeneration({ request, lenses: resolvedLenses, brandContext, campaignContext })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
