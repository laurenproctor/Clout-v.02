import { createHash } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { callClaude } from '@/lib/ai/generate'
import { listConversationThemes, loadConversationWorkspaceContext } from '@/lib/domain/conversations'
import type { ComputedNarrative, ComputedNarrativeOpportunity, ComputedNarrativeSourceSummary, ConversationOpportunityType, ConversationSourceType, ConversationTheme } from '@/types/domain'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_NARRATIVES = 5
const MAX_THEMES     = 15
const MAX_OPPS       = 60
const OPP_MIN_SCORE  = 50
const MS_DAY         = 24 * 60 * 60 * 1000

const SOURCE_LABELS: Record<string, string> = {
  substack:       'Substack',
  substack_notes: 'Notes',
  rss:            'RSS',
  generic:        'Web',
  reddit:         'Reddit',
  linkedin:       'LinkedIn',
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawOpp {
  id: string
  title: string
  opportunityType: ConversationOpportunityType
  overallScore: number
  themeId: string | null
  generatedAt: string
  sourceType: ConversationSourceType
  sourceTitle: string | null
}

interface RawNarrative {
  title: string
  description: string
  whyThisMatters: string
  themeIndices: number[]
  opportunityIndices: number[]
  workspaceRelevance: number
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function computeNarratives(workspaceId: string): Promise<ComputedNarrative[]> {
  const [ctx, themesResult, opps] = await Promise.all([
    loadConversationWorkspaceContext(workspaceId),
    listConversationThemes(workspaceId),
    loadOpportunitiesForNarratives(workspaceId),
  ])

  const themes = (themesResult.ok ? themesResult.data : []).slice(0, MAX_THEMES)
  if (themes.length === 0 || opps.length === 0) return []

  const raw = await detectNarrativeClusters(ctx.displayName, ctx.contentTopics, ctx.services, themes, opps)

  const results: ComputedNarrative[] = []

  for (const r of raw) {
    const linkedOpps   = r.opportunityIndices
      .filter(i => i >= 0 && i < opps.length)
      .map(i => opps[i])
    const linkedThemes = r.themeIndices
      .filter(i => i >= 0 && i < themes.length)
      .map(i => themes[i])

    const uniqueSourceTypes = [...new Set(linkedOpps.map(o => o.sourceType))]
    if (uniqueSourceTypes.length < 2) continue   // cross-source requirement

    const velocityPct        = computeVelocity(linkedOpps.map(o => o.generatedAt))
    const lastDetectedAt     = latestDate(linkedOpps.map(o => o.generatedAt))
    const firstDetectedAt    = earliestDate([
      ...linkedThemes.map(t => t.firstDetectedAt),
      ...linkedOpps.map(o => o.generatedAt),
    ])
    const daysSinceLast      = lastDetectedAt
      ? Math.round((Date.now() - new Date(lastDetectedAt).getTime()) / MS_DAY)
      : 0

    const narrativeScore = computeNarrativeScore({
      opportunityCount:  linkedOpps.length,
      uniqueSourceTypes: uniqueSourceTypes.length,
      velocityPct,
      daysSinceLastEvidence: daysSinceLast,
      workspaceRelevance: r.workspaceRelevance,
    })

    const sourceSummary: ComputedNarrativeSourceSummary[] = uniqueSourceTypes.map(st => ({
      sourceType: st,
      label:      SOURCE_LABELS[st] ?? st,
      count:      linkedOpps.filter(o => o.sourceType === st).length,
    }))

    const topOpportunities: ComputedNarrativeOpportunity[] = [...linkedOpps]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 5)
      .map(o => ({
        id:              o.id,
        title:           o.title,
        opportunityType: o.opportunityType,
        overallScore:    o.overallScore,
        sourceType:      o.sourceType,
        sourceTitle:     o.sourceTitle,
      }))

    results.push({
      id:               narrativeId(workspaceId, r.title),
      title:            r.title,
      description:      r.description,
      whyThisMatters:   r.whyThisMatters,
      narrativeScore,
      velocityPct,
      sourceCount:      uniqueSourceTypes.length,
      opportunityCount: linkedOpps.length,
      sourceSummary,
      recommendedAction: deriveRecommendedAction(narrativeScore, velocityPct, uniqueSourceTypes.length),
      topOpportunities,
      firstDetectedAt,
      lastDetectedAt,
    })

    if (results.length >= MAX_NARRATIVES) break
  }

  return results.sort((a, b) => b.narrativeScore - a.narrativeScore)
}

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadOpportunitiesForNarratives(workspaceId: string): Promise<RawOpp[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any
  const since = new Date(Date.now() - 30 * MS_DAY).toISOString()

  const { data, error } = await supabase
    .from('conversation_opportunities')
    .select(`
      id, title, opportunity_type, overall_score, theme_id, generated_at,
      item:conversation_items!inner(
        source:conversation_sources!inner(source_type, title)
      )
    `)
    .eq('workspace_id', workspaceId)
    .gte('overall_score', OPP_MIN_SCORE)
    .gte('generated_at', since)
    .eq('status', 'active')
    .order('overall_score', { ascending: false })
    .limit(MAX_OPPS)

  if (error || !data) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map(r => ({
    id:              r.id as string,
    title:           r.title as string,
    opportunityType: r.opportunity_type as ConversationOpportunityType,
    overallScore:    r.overall_score as number,
    themeId:         r.theme_id as string | null,
    generatedAt:     r.generated_at as string,
    sourceType:      (r.item?.source?.source_type ?? 'generic') as ConversationSourceType,
    sourceTitle:     (r.item?.source?.title ?? null) as string | null,
  }))
}

// ─── Narrative detection (Claude Haiku) ───────────────────────────────────────

async function detectNarrativeClusters(
  displayName: string,
  contentTopics: string[],
  services: string[],
  themes: ConversationTheme[],
  opps: RawOpp[],
): Promise<RawNarrative[]> {
  const themeList = themes
    .map((t, i) => `[T:${i}] "${t.title}" | score:${t.themeScore}`)
    .join('\n')

  const oppList = opps
    .map((o, i) => `[O:${i}] "${o.title}" | type:${o.sourceType} | score:${o.overallScore}${o.themeId ? ` | theme:[T:${themes.findIndex(t => t.id === o.themeId)}]` : ''}`)
    .join('\n')

  const result = await callClaude({
    systemPrompt: `You identify cross-source narratives — ideas gaining momentum across multiple distinct platforms simultaneously. Not single-platform trends.

A narrative MUST have evidence from at least 2 distinct source types (reddit, linkedin, substack, rss/generic, etc.).

Return up to 5 narratives. For each:
- title: 4-8 words, directional (what is actually shifting or emerging)
- description: 2-3 sentences — what is happening, why it is crossing platforms, where it appears headed
- whyThisMatters: 1-2 sentences — why this specific workspace should care NOW, what opportunity or risk it represents for them
- themeIndices: indices from [T:N] markers belonging to this narrative
- opportunityIndices: indices from [O:N] markers that are evidence
- workspaceRelevance: 0-100

Discard any narrative without at least 2 distinct source types represented.
Return ONLY valid JSON — no commentary:
[{"title":"...","description":"...","whyThisMatters":"...","themeIndices":[...],"opportunityIndices":[...],"workspaceRelevance":<n>}]`,
    userMessage: `Workspace: ${displayName}
Topics: ${contentTopics.join(', ')}
Services: ${services.join(', ')}

THEMES (last 30 days):
${themeList}

OPPORTUNITIES (recent, high-scoring):
${oppList}`,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 1024,
  })

  return parseNarrativeResult(result.content)
}

function parseNarrativeResult(raw: string): RawNarrative[] {
  try {
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return []
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .slice(0, MAX_NARRATIVES)
      .map((r: Record<string, unknown>) => ({
        title:              String(r.title ?? '').slice(0, 100),
        description:        String(r.description ?? ''),
        whyThisMatters:     String(r.whyThisMatters ?? ''),
        themeIndices:       Array.isArray(r.themeIndices) ? r.themeIndices.filter((i): i is number => typeof i === 'number') : [],
        opportunityIndices: Array.isArray(r.opportunityIndices) ? r.opportunityIndices.filter((i): i is number => typeof i === 'number') : [],
        workspaceRelevance: Math.min(100, Math.max(0, Number(r.workspaceRelevance) || 0)),
      }))
      .filter(r => r.title && r.opportunityIndices.length >= 2)
  } catch {
    return []
  }
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

function computeNarrativeScore({
  opportunityCount,
  uniqueSourceTypes,
  velocityPct,
  daysSinceLastEvidence,
  workspaceRelevance,
}: {
  opportunityCount: number
  uniqueSourceTypes: number
  velocityPct: number
  daysSinceLastEvidence: number
  workspaceRelevance: number
}): number {
  const volume    = Math.min(opportunityCount * 2, 20)
  const crossSrc  = Math.min((uniqueSourceTypes / 4) * 100, 100) * 0.35
  const velocity  = Math.min(Math.max(velocityPct, 0) * 0.15, 15)
  const freshness = Math.max(0, Math.round(15 * Math.pow(0.93, daysSinceLastEvidence)))
  const relevance = Math.round(workspaceRelevance * 0.15)
  return Math.min(Math.round(volume + crossSrc + velocity + freshness + relevance), 100)
}

function deriveRecommendedAction(score: number, velocityPct: number, sourceCount: number): string {
  if (score >= 80 && velocityPct > 30) return 'Publish a contrarian perspective'
  if (score >= 70 && sourceCount >= 3)  return 'Write a definitive framework'
  if (velocityPct > 50)                 return 'Join the growing discussion'
  return 'Monitor and gather more context'
}

function computeVelocity(timestamps: string[]): number {
  const last7d = timestamps.filter(t => msSince(t) <= 7 * MS_DAY).length
  const prev7d = timestamps.filter(t => { const ms = msSince(t); return ms > 7 * MS_DAY && ms <= 14 * MS_DAY }).length
  if (prev7d === 0) return last7d > 0 ? 100 : 0
  return Math.round(((last7d - prev7d) / prev7d) * 100)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function narrativeId(workspaceId: string, title: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(`${workspaceId}:${normalized}`).digest('hex').slice(0, 64)
}

function msSince(iso: string): number {
  return Date.now() - new Date(iso).getTime()
}

function latestDate(isos: (string | null)[]): string | null {
  const valid = isos.filter(Boolean) as string[]
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b))
}

function earliestDate(isos: (string | null)[]): string | null {
  const valid = isos.filter(Boolean) as string[]
  if (valid.length === 0) return null
  return valid.reduce((a, b) => (new Date(a) < new Date(b) ? a : b))
}
