import { callClaude } from '@/lib/ai/generate'
import type { ConversationOpportunityType } from '@/types/domain'

const VALID_TYPES: ConversationOpportunityType[] = [
  'comment', 'note', 'post', 'framework', 'narrative', 'question', 'counterpoint', 'agreement',
]

export interface ActiveThemeSummary {
  title: string
  themeScore: number
  sourceCount: number
}

export interface WorkspaceContext {
  displayName: string
  toneNotes: string
  mentalModels: string
  philosophies: string
  targetAudiences: string[]
  contentTopics: string[]
  services: string[]
  sampleContent: string[]
  focusTopics: string[]
  recentPublishedPosts: string[]
  activeThemes: ActiveThemeSummary[]
}

export interface OpportunityDetection {
  opportunityType: ConversationOpportunityType
  title: string
  explanation: string
  whyThisMatters: string | null
  opportunityScore: number
}

export interface AnalysisResult {
  relevanceScore: number
  uniquenessScore: number
  opportunities: OpportunityDetection[]
}

export function computeTimelinessScore(publishedAt: string | null): number {
  if (!publishedAt) return 60
  const daysSince = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (daysSince > 30) return 0
  return Math.max(0, Math.round(100 * Math.pow(0.93, daysSince)))
}

export function computeOverallScore(
  relevance: number, timeliness: number, uniqueness: number, opportunity: number, authority: number
): number {
  return Math.round(
    opportunity * 0.30 +
    relevance   * 0.25 +
    timeliness  * 0.18 +
    uniqueness  * 0.12 +
    authority   * 0.15
  )
}

export async function analyzeConversationItem(
  item: { title: string | null; excerpt: string | null; bodyMarkdown: string | null; sourceUrl: string; publishedAt: string | null; contentType?: string },
  context: WorkspaceContext
): Promise<AnalysisResult> {
  const isNote = item.contentType === 'note'
  const content = (item.bodyMarkdown ?? item.excerpt ?? '').slice(0, 800)
  const contentLabel = isNote ? '[Short-form Note — 50-200 words]\n' : ''

  const result = await callClaude({
    systemPrompt: buildAnalysisSystemPrompt(context),
    userMessage: `Article URL: ${item.sourceUrl}
Title: ${item.title ?? 'Untitled'}
Content: ${contentLabel}${content}`,
    model: 'claude-sonnet-4-6',
    maxTokens: 1024,
  })

  const parsed = parseAnalysisResult(result.content)

  // Bias opportunity types toward note/comment for short-form source content
  if (isNote) {
    parsed.opportunities = parsed.opportunities.map(opp => {
      let score = opp.opportunityScore
      if (opp.opportunityType === 'note' || opp.opportunityType === 'comment') score += 15
      if (opp.opportunityType === 'framework' || opp.opportunityType === 'post') score -= 10
      return { ...opp, opportunityScore: clamp(score) }
    })
  }

  return parsed
}

function buildAnalysisSystemPrompt(ctx: WorkspaceContext): string {
  const recentPostsSummary = ctx.recentPublishedPosts.length > 0
    ? `\nRECENT PUBLISHED POSTS (use to assess uniqueness — avoid repeating covered topics):\n${ctx.recentPublishedPosts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`
    : ''

  const themesSummary = ctx.activeThemes.length > 0
    ? `\nACTIVE CROSS-SOURCE THEMES (detected this cycle — multiple publications covering these):\n${ctx.activeThemes.map(t => `- "${t.title}" (score: ${t.themeScore}, ${t.sourceCount} source${t.sourceCount !== 1 ? 's' : ''})`).join('\n')}`
    : ''

  const focusTopicsSection = ctx.focusTopics.length > 0
    ? `\nFocus topics (mild relevance nudge — if content closely matches one of these, apply a small boost to relevanceScore, at most +5–10 points; do NOT apply a large boost — these are ranking hints, not hard requirements):\n${ctx.focusTopics.join(', ')}`
    : ''

  return `You analyze published content to identify high-value participation opportunities for a thought leader.

WORKSPACE CONTEXT
Name: ${ctx.displayName}
Topics of expertise: ${ctx.contentTopics.join(', ') || 'general'}
Services: ${ctx.services.join(', ') || 'none listed'}
Voice/Tone: ${ctx.toneNotes || 'professional'}
Mental models: ${ctx.mentalModels}
Core philosophies: ${ctx.philosophies}
Target audiences: ${ctx.targetAudiences.join(', ') || 'general'}${focusTopicsSection}${recentPostsSummary}${themesSummary}

TASK
Return a JSON object with:
- relevanceScore (0-100): how relevant is this content to the workspace's expertise, services, and audience?
- uniquenessScore (0-100): how much does the workspace have a FRESH perspective to add, given their recent posts? (100 = totally new territory for them; 0 = they've covered this recently)
- opportunities: array of 0-3 high-value participation opportunities

For each opportunity:
- opportunityType: one of comment|note|post|framework|narrative|question|counterpoint|agreement
- title: concise action phrase, max 80 chars (e.g. "Share your SaaS pricing framework in response")
- explanation: 1-2 sentences on WHY this workspace should participate and WHAT specific value they'd add
- whyThisMatters: 1 sentence on why this conversation matters NOW — if this article connects to an active theme above, reference that (e.g. "This is one of 4 sources discussing X this week"). Null if no broader context.
- opportunityScore (0-100): how impactful could this contribution be for the workspace's influence?

Only identify opportunities with genuine, specific value to add. 0 opportunities is correct if the content isn't relevant. If relevanceScore < 40, return an empty opportunities array.

Return ONLY valid JSON — no commentary, no markdown fences:
{"relevanceScore":<n>,"uniquenessScore":<n>,"opportunities":[{"opportunityType":"<type>","title":"<title>","explanation":"<explanation>","whyThisMatters":"<sentence or null>","opportunityScore":<n>}]}`
}

export function parseAnalysisResult(raw: string): AnalysisResult {
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { relevanceScore: 0, uniquenessScore: 0, opportunities: [] }
    const parsed = JSON.parse(match[0])
    return {
      relevanceScore: clamp(Number(parsed.relevanceScore) || 0),
      uniquenessScore: clamp(Number(parsed.uniquenessScore) || 0),
      opportunities: (Array.isArray(parsed.opportunities) ? parsed.opportunities : [])
        .slice(0, 3)
        .map((o: Record<string, unknown>) => ({
          opportunityType: o.opportunityType as ConversationOpportunityType,
          title: String(o.title ?? '').slice(0, 120),
          explanation: String(o.explanation ?? ''),
          whyThisMatters: (o.whyThisMatters && typeof o.whyThisMatters === 'string') ? o.whyThisMatters : null,
          opportunityScore: clamp(Number(o.opportunityScore) || 0),
        }))
        .filter((o: OpportunityDetection) => VALID_TYPES.includes(o.opportunityType)),
    }
  } catch {
    return { relevanceScore: 0, uniquenessScore: 0, opportunities: [] }
  }
}

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}
