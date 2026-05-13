import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { runLinkedInGeneration } from '@/lib/linkedin/runGeneration'
import { scrapeUrl } from '@/lib/scraper'
import type { LinkedInGenerationRequest } from '@/lib/linkedin/types'

export const maxDuration = 120

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

  // Validate minimum required fields
  if (!request?.postType || !request?.sourceContent || !request?.intent || !request?.audience) {
    return new Response(
      JSON.stringify({ error: 'postType, sourceContent, intent, and audience are required' }),
      { status: 400 }
    )
  }

  // Detect URLs in any source type — not just the URL tab.
  // If the source content is a bare URL (regardless of which tab was used),
  // scrape it and embed the URL with a CTA in every post variation.
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
      // If scraping fails, include the URL as context and proceed — don't block generation
      console.warn('[linkedin/generate] URL scrape failed, proceeding with URL as context:', msg)
      request.sourceContent = `Source URL: ${rawUrl}\n\n(Full content could not be retrieved — base the post on what this URL likely covers based on context clues.)`
      request.sourceUrl = rawUrl
    }
  }

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map((l) => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const ctx = { request, lenses: resolvedLenses }
  const stream = runLinkedInGeneration(ctx)

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
