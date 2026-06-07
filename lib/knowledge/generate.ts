import { createHash } from 'crypto'
import { callClaude } from '@/lib/ai/generate'
import type { KnowledgeTopic } from '@/types/feed'

// ── Types ──────────────────────────────────────────────────────────────────

export interface WorkspaceContext {
  brand_name: string
  services: string[]
  content_topics: string[]
  recent_titles: string[]
}

export interface KnowledgeSignalsCache {
  industry_summary: string
  topics: KnowledgeTopic[]
  generated_at: string
  context_hash: string
}

// ── Utilities ──────────────────────────────────────────────────────────────

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function buildContextHash(ctx: WorkspaceContext): string {
  const titlesSignature = createHash('sha256')
    .update(ctx.recent_titles.join('|'))
    .digest('hex')

  const payload = JSON.stringify({
    brand_name: ctx.brand_name,
    services: ctx.services.slice().sort(),
    content_topics: ctx.content_topics.slice().sort(),
    recent_titles_signature: titlesSignature,
  })

  return createHash('sha256').update(payload).digest('hex')
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function isCacheFresh(cache: KnowledgeSignalsCache, currentHash: string): boolean {
  if (cache.context_hash !== currentHash) return false
  return Date.now() - new Date(cache.generated_at).getTime() < CACHE_TTL_MS
}

export function hasEnoughContext(ctx: WorkspaceContext): boolean {
  return (
    ctx.services.length > 0 ||
    ctx.content_topics.length > 0 ||
    ctx.recent_titles.length >= 5
  )
}

export function deduplicateTopics(topics: KnowledgeTopic[]): KnowledgeTopic[] {
  const seen = new Set<string>()
  return topics.filter(t => {
    const key = slugify(t.title)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Prompt builders ────────────────────────────────────────────────────────

export function buildSystemPrompt(): string {
  return `You are a knowledge curator for professional content creators and thought leaders.

Your job is to identify the most important knowledge domains a content creator should master and be able to write about authoritatively — given their business, services, and what they already post about.

Generate 8–12 knowledge topics across these categories:
- foundational (2–3): concepts everyone in the field must understand
- advanced (2–3): deeper frameworks, techniques, or debates for practitioners
- emerging (1–2): new ideas gaining traction, not yet mainstream
- debate (1–2): contested questions where smart people genuinely disagree
- thinker (1): a key voice or practitioner they should know

IMPORTANT RULES:
- Generate topics specific to the workspace's actual industry and domain expertise.
- Do NOT generate generic creator, marketing, branding, social media, audience growth, content strategy, personal branding, or thought leadership topics unless those topics are the workspace's actual business (e.g. a marketing agency).
- Prioritize industry knowledge, operational expertise, technical concepts, frameworks, trends, debates, and domain-specific thinking.
- For thinkers and recommended_reading: only include if you are highly confident they are real and directly relevant. Empty arrays are acceptable and preferred over guesses.
- For debate category topics, populate debate_for and debate_against arrays with 3–4 items each.

Also return a short industry_summary (2–5 lines) naming the workspace's inferred industry and key subdomains. Example:
"Industry: Industrial Waste Management & Resource Recovery\\nSubdomains:\\n- Hazardous Waste\\n- Wastewater Treatment\\n- Metals Recovery"

Respond with a JSON object — no markdown fences, no explanation, just the JSON — with exactly this shape:
{
  "industry_summary": "string",
  "topics": [
    {
      "title": "string",
      "category": "foundational|advanced|emerging|debate|thinker",
      "importance_score": 0-100,
      "importance_level": "essential|important|specialized|emerging",
      "status": "core|trending|controversial|emerging",
      "summary": "2-3 sentence explanation of why this matters in the field",
      "frameworks": ["Framework Name"],
      "thinkers": [],
      "debates": ["A key open question"],
      "related_topics": ["Related Topic Name"],
      "recommended_reading": [],
      "content_angles": ["Angle 1 (5–10 words)", "Angle 2", "Angle 3"],
      "frequently_confused_with": [],
      "debate_for": [],
      "debate_against": [],
      "trend_connections": [],
      "related_signal_topics": []
    }
  ]
}`
}

export function buildUserMessage(ctx: WorkspaceContext): string {
  const lines: string[] = []
  if (ctx.brand_name) lines.push(`Brand: ${ctx.brand_name}`)
  if (ctx.services.length > 0) lines.push(`Services: ${ctx.services.join(', ')}`)
  if (ctx.content_topics.length > 0) lines.push(`Content topics: ${ctx.content_topics.join(', ')}`)
  if (ctx.recent_titles.length > 0) {
    lines.push(`Recent post titles (most recent first):`)
    ctx.recent_titles.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
  }
  return lines.join('\n')
}

// ── Response parsing ───────────────────────────────────────────────────────

export function parseGenerationResponse(raw: string): { industry_summary: string; topics: KnowledgeTopic[] } | null {
  // Strip markdown fences if present
  const stripped = raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()

  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  if (!Array.isArray(obj.topics)) return null
  if (typeof obj.industry_summary !== 'string') return null

  const validTopics = (obj.topics as unknown[])
    .filter((t): t is Record<string, unknown> => {
      if (typeof t !== 'object' || t === null) return false
      const topic = t as Record<string, unknown>
      return (
        typeof topic.title === 'string' && topic.title.length > 0 &&
        typeof topic.category === 'string' &&
        typeof topic.summary === 'string' &&
        Array.isArray(topic.content_angles) && topic.content_angles.length > 0
      )
    })
    .map((t): KnowledgeTopic => ({
      id: '',
      title: t.title as string,
      category: t.category as KnowledgeTopic['category'],
      importance_score: typeof t.importance_score === 'number' ? t.importance_score : 75,
      importance_level: typeof t.importance_level === 'string' ? t.importance_level as KnowledgeTopic['importance_level'] : 'important',
      status: typeof t.status === 'string' ? t.status as KnowledgeTopic['status'] : 'core',
      summary: t.summary as string,
      frameworks: Array.isArray(t.frameworks) ? t.frameworks as string[] : [],
      thinkers: Array.isArray(t.thinkers) ? t.thinkers as string[] : [],
      debates: Array.isArray(t.debates) ? t.debates as string[] : [],
      related_topics: Array.isArray(t.related_topics) ? t.related_topics as string[] : [],
      recommended_reading: Array.isArray(t.recommended_reading) ? t.recommended_reading as KnowledgeTopic['recommended_reading'] : [],
      content_angles: t.content_angles as string[],
      frequently_confused_with: Array.isArray(t.frequently_confused_with) ? t.frequently_confused_with as string[] : [],
      debate_for: Array.isArray(t.debate_for) ? t.debate_for as string[] : [],
      debate_against: Array.isArray(t.debate_against) ? t.debate_against as string[] : [],
      trend_connections: Array.isArray(t.trend_connections) ? t.trend_connections as string[] : [],
      related_signal_topics: Array.isArray(t.related_signal_topics) ? t.related_signal_topics as string[] : [],
    }))

  if (validTopics.length === 0) return null
  return { industry_summary: obj.industry_summary as string, topics: validTopics }
}

// ── Main generation function ───────────────────────────────────────────────

export async function generateKnowledgeTopics(ctx: WorkspaceContext): Promise<KnowledgeSignalsCache> {
  const hash = buildContextHash(ctx)

  const result = await callClaude({
    systemPrompt: buildSystemPrompt(),
    userMessage: buildUserMessage(ctx),
    maxTokens: 8000,
  })

  const parsed = parseGenerationResponse(result.content)
  if (!parsed) throw new Error('Failed to parse knowledge topics from Claude response')

  const topics = deduplicateTopics(
    parsed.topics.map(t => ({ ...t, id: slugify(t.title) }))
  )

  return {
    industry_summary: parsed.industry_summary,
    topics,
    generated_at: new Date().toISOString(),
    context_hash: hash,
  }
}
