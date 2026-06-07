import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { runThreadsGeneration } from '@/lib/threads/runGeneration'
import { scrapeUrl } from '@/lib/scraper'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { saveCustomAudience } from '@/lib/audiences'
import type { ThreadsGenerationRequest } from '@/lib/threads/types'

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
  const request = (body as { request?: unknown }).request as ThreadsGenerationRequest

  if (!request?.sourceContent || !request?.audience) {
    return new Response(
      JSON.stringify({ error: 'sourceContent and audience are required' }),
      { status: 400 }
    )
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
      console.warn('[threads/generate] URL scrape failed, proceeding with URL as context:', msg)
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

  if (request.audience === 'custom' && request.customAudience?.trim()) {
    saveCustomAudience(session.workspaceId, request.customAudience).catch(() => {})
  }

  const stream = runThreadsGeneration({ request, lenses: resolvedLenses, brandContext })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
