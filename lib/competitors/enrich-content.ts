import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export interface ContentEnrichment {
  summary: string
  topics:  string[]
}

export async function enrichContent(
  title: string | undefined,
  content: string,
  sourceType: string,
): Promise<ContentEnrichment> {
  const text = [title, content].filter(Boolean).join('\n').slice(0, 1200)
  if (!text.trim()) return { summary: '', topics: [] }

  try {
    const msg = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{
        role:    'user',
        content: `Analyze this ${sourceType} post from a competitor brand. Respond with JSON only — no explanation, no markdown fences.

Content:
${text}

Respond with exactly:
{"summary":"2 sentence summary of what this content is about and why it matters","topics":["Topic1","Topic2","Topic3"]}

Topics should be 1-3 words each, describing the main strategic themes (e.g. "Product Launch", "AI", "Creator Economy"). Max 5 topics.`,
      }],
    })

    const raw = msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
    const json = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed = JSON.parse(json) as { summary?: string; topics?: unknown[] }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 300) : '',
      topics:  Array.isArray(parsed.topics)
        ? parsed.topics.filter((t): t is string => typeof t === 'string').slice(0, 5)
        : [],
    }
  } catch (err) {
    console.warn('[enrich-content] Claude call failed:', err instanceof Error ? err.message : err)
    return { summary: '', topics: [] }
  }
}
