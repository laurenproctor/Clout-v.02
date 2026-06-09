import { getProvider } from './providers'
import { analyzeConversationItem, computeTimelinessScore, computeOverallScore } from './analysis'
import { detectAndSaveThemes } from './themes'
import { matchesBlockedKeyword, buildSearchableText } from './utils'
import {
  listActiveConversationSources,
  insertConversationItemIfNew,
  insertConversationOpportunities,
  markSourceSuccess,
  markSourceError,
  loadConversationWorkspaceContext,
  loadFollowedContext,
  getConversationPreferences,
  linkOpportunitiesToThemes,
  suppressSimilarOpportunities,
} from '@/lib/domain/conversations'
import type { ConversationSource, ConversationItem } from '@/types/domain'
import type { NormalizedItem } from './providers'
import type { ActiveThemeSummary } from './analysis'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000
const MAX_ITEMS_PER_SOURCE = 10
const MAX_ITEMS_PER_WORKSPACE_PER_RUN = 100
const MAX_SONNET_ANALYSES_PER_WORKSPACE = 50

function normalizeAuthorName(name: string): string {
  return name
    .toLowerCase()
    .replace(/,.*$/, '')
    .replace(/\b(jr|sr|ii|iii|iv|mba|phd|md|esq)\.?\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function ingestSource(source: ConversationSource): Promise<{
  newItems: Array<{ item: ConversationItem; normalized: NormalizedItem }>
  skipped: number
  errors: number
}> {
  const provider = getProvider(source.sourceUrl, source.sourceType)
  let normalized: NormalizedItem[]

  try {
    normalized = await provider.fetch(source.sourceUrl)
  } catch (err) {
    console.error(`[conversations] fetch failed for source ${source.id}:`, err)
    await markSourceError(source.id)
    return { newItems: [], skipped: 0, errors: 1 }
  }

  const candidates = normalized
    .filter(item => {
      if (!item.publishedAt) return true
      return Date.now() - new Date(item.publishedAt).getTime() <= THIRTY_DAYS_MS
    })
    .sort((a, b) => {
      if (!a.publishedAt) return 1
      if (!b.publishedAt) return -1
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
    .slice(0, MAX_ITEMS_PER_SOURCE)

  const newItems: Array<{ item: ConversationItem; normalized: NormalizedItem }> = []
  let skipped = 0, errors = 0

  for (const n of candidates) {
    const insertResult = await insertConversationItemIfNew({
      sourceId: source.id, workspaceId: source.workspaceId, externalId: n.externalId,
      contentHash: n.contentHash, canonicalUrl: n.canonicalUrl, contentType: n.contentType,
      title: n.title, author: n.author, authorUrl: n.authorUrl, publication: n.publication,
      sourceUrl: n.sourceUrl, excerpt: n.excerpt, bodyMarkdown: n.bodyMarkdown,
      heroImage: n.heroImage, publishedAt: n.publishedAt, metadata: n.metadata,
    })
    if (!insertResult.ok) { errors++; continue }
    if (!insertResult.data) { skipped++; continue }
    newItems.push({ item: insertResult.data, normalized: n })
  }

  await markSourceSuccess(source.id, newItems.length)
  return { newItems, skipped, errors }
}

export async function ingestSingleSource(source: ConversationSource): Promise<void> {
  const { newItems } = await ingestSource(source)
  if (newItems.length === 0) return

  const wsId = source.workspaceId

  let activeThemes: ActiveThemeSummary[] = []
  try {
    activeThemes = await detectAndSaveThemes(wsId)
  } catch (err) {
    console.error(`[conversations] theme detection failed for workspace ${wsId}:`, err)
  }

  const [context, followedCtx, prefsResult] = await Promise.all([
    loadConversationWorkspaceContext(wsId),
    loadFollowedContext(wsId),
    getConversationPreferences(wsId),
  ])
  const blockedKeywords = prefsResult.ok ? prefsResult.data.blockedKeywords : []
  const contextWithThemes = { ...context, activeThemes }

  let sonnetCallCount = 0

  for (const { item, normalized: n } of newItems) {
    if (sonnetCallCount >= MAX_SONNET_ANALYSES_PER_WORKSPACE) break

    const searchableText = buildSearchableText([n.title, n.excerpt, item.summary])
    if (matchesBlockedKeyword(searchableText, blockedKeywords)) continue

    const authorNorm = n.author ? normalizeAuthorName(n.author) : null
    const isFollowedAuthor = authorNorm
      ? followedCtx.authorNames.some(a => normalizeAuthorName(a) === authorNorm)
      : false
    const isFollowedPub = followedCtx.publicationUrls.some(url =>
      source.sourceUrl.startsWith(url) || url.startsWith(source.sourceUrl)
    )
    const timelinessScore = computeTimelinessScore(n.publishedAt)

    try {
      const analysis = await analyzeConversationItem(n, contextWithThemes)
      sonnetCallCount++
      const boostedRelevance = Math.min(100,
        analysis.relevanceScore +
        (isFollowedAuthor ? 20 : 0) +
        (isFollowedPub ? 15 : 0)
      )

      if (boostedRelevance >= 40 && analysis.opportunities.length > 0) {
        await insertConversationOpportunities(
          analysis.opportunities.map(o => ({
            workspaceId: wsId,
            itemId: item.id,
            themeId: null,
            opportunityType: o.opportunityType,
            title: o.title,
            explanation: o.explanation,
            whyThisMatters: o.whyThisMatters ?? null,
            relevanceScore: boostedRelevance,
            timelinessScore,
            uniquenessScore: analysis.uniquenessScore,
            opportunityScore: o.opportunityScore,
            authorityScore: source.authorityScore,
            overallScore: computeOverallScore(
              boostedRelevance, timelinessScore,
              analysis.uniquenessScore, o.opportunityScore,
              source.authorityScore
            ),
          }))
        )
      }
    } catch (err) {
      console.error(`[conversations] analysis failed for item ${item.id}:`, err)
    }

    await new Promise(r => setTimeout(r, 200))
  }

  try {
    await linkOpportunitiesToThemes(wsId)
    await suppressSimilarOpportunities(wsId)
  } catch (err) {
    console.error(`[conversations] phase 4 failed for workspace ${wsId}:`, err)
  }
}

export async function ingestAllSources(workspaceId?: string): Promise<{
  totalProcessed: number; totalSkipped: number; totalErrors: number
}> {
  const sourcesResult = await listActiveConversationSources(workspaceId)
  if (!sourcesResult.ok) return { totalProcessed: 0, totalSkipped: 0, totalErrors: 0 }

  // Phase 1: Ingest all sources (no AI)
  const workspaceNewItems = new Map<string, Array<{ item: ConversationItem; normalized: NormalizedItem; source: ConversationSource }>>()
  let totalSkipped = 0, totalErrors = 0

  for (const source of sourcesResult.data) {
    const { newItems, skipped, errors } = await ingestSource(source)
    totalSkipped += skipped
    totalErrors += errors
    if (!workspaceNewItems.has(source.workspaceId)) workspaceNewItems.set(source.workspaceId, [])
    for (const entry of newItems) {
      workspaceNewItems.get(source.workspaceId)!.push({ ...entry, source })
    }
    await new Promise(r => setTimeout(r, 300))
  }

  let totalProcessed = 0

  for (const [wsId, allEntries] of workspaceNewItems) {
    // Phase 2: Theme detection (Haiku, per workspace)
    let activeThemes: ActiveThemeSummary[] = []
    try {
      activeThemes = await detectAndSaveThemes(wsId)
    } catch (err) {
      console.error(`[conversations] theme detection failed for workspace ${wsId}:`, err)
    }

    // Phase 3: Opportunity analysis (Sonnet, with theme context)
    // Load all workspace context + preferences once — not per item
    const [context, followedCtx, prefsResult] = await Promise.all([
      loadConversationWorkspaceContext(wsId),
      loadFollowedContext(wsId),
      getConversationPreferences(wsId),
    ])
    const blockedKeywords = prefsResult.ok ? prefsResult.data.blockedKeywords : []
    const contextWithThemes = { ...context, activeThemes }

    // Priority ordering before applying workspace caps
    const prioritized = allEntries
      .map(e => {
        const authorNorm = e.normalized.author ? normalizeAuthorName(e.normalized.author) : null
        const isFollowedAuthor = authorNorm
          ? followedCtx.authorNames.some(a => normalizeAuthorName(a) === authorNorm)
          : false
        const isFollowedPub = followedCtx.publicationUrls.some(url =>
          e.source.sourceUrl.startsWith(url) || url.startsWith(e.source.sourceUrl)
        )
        const priority = isFollowedAuthor ? 0 : isFollowedPub ? 1 : e.source.authorityScore >= 70 ? 2 : 3
        return { ...e, priority, isFollowedAuthor, isFollowedPub }
      })
      .sort((a, b) => a.priority - b.priority || new Date(b.normalized.publishedAt ?? 0).getTime() - new Date(a.normalized.publishedAt ?? 0).getTime())
      .slice(0, MAX_ITEMS_PER_WORKSPACE_PER_RUN)

    let sonnetCallCount = 0

    for (const { item, normalized: n, source, isFollowedAuthor, isFollowedPub } of prioritized) {
      if (sonnetCallCount >= MAX_SONNET_ANALYSES_PER_WORKSPACE) {
        console.log(`[conversations] workspace ${wsId} hit Sonnet cap (${MAX_SONNET_ANALYSES_PER_WORKSPACE}), stopping Phase 3`)
        break
      }

      const searchableText = buildSearchableText([n.title, n.excerpt, item.summary])
      if (matchesBlockedKeyword(searchableText, blockedKeywords)) continue

      const timelinessScore = computeTimelinessScore(n.publishedAt)

      try {
        const analysis = await analyzeConversationItem(n, contextWithThemes)
        sonnetCallCount++
        const boostedRelevance = Math.min(100,
          analysis.relevanceScore +
          (isFollowedAuthor ? 20 : 0) +
          (isFollowedPub ? 15 : 0)
        )

        if (boostedRelevance >= 40 && analysis.opportunities.length > 0) {
          await insertConversationOpportunities(
            analysis.opportunities.map(o => ({
              workspaceId: wsId,
              itemId: item.id,
              themeId: null,
              opportunityType: o.opportunityType,
              title: o.title,
              explanation: o.explanation,
              whyThisMatters: o.whyThisMatters ?? null,
              relevanceScore: boostedRelevance,
              timelinessScore,
              uniquenessScore: analysis.uniquenessScore,
              opportunityScore: o.opportunityScore,
              authorityScore: source.authorityScore,
              overallScore: computeOverallScore(
                boostedRelevance, timelinessScore,
                analysis.uniquenessScore, o.opportunityScore,
                source.authorityScore
              ),
            }))
          )
        }
      } catch (err) {
        console.error(`[conversations] analysis failed for item ${item.id}:`, err)
        totalErrors++
      }

      totalProcessed++
      await new Promise(r => setTimeout(r, 200))
    }

    // Phase 4: Link opportunities → themes, then suppress duplicates
    try {
      await linkOpportunitiesToThemes(wsId)
      await suppressSimilarOpportunities(wsId)
    } catch (err) {
      console.error(`[conversations] phase 4 failed for workspace ${wsId}:`, err)
    }
  }

  return { totalProcessed, totalSkipped, totalErrors }
}
