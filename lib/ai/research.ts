import { callClaude } from '@/lib/ai/generate'
import type { ResearchSource } from '@/types/domain'

const TAVILY_ENDPOINT = 'https://api.tavily.com/search'
const RESEARCH_TIMEOUT_MS = 12_000

export async function searchTavily(query: string): Promise<ResearchSource[]> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) throw new Error('TAVILY_API_KEY is not set')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), RESEARCH_TIMEOUT_MS)

  try {
    const res = await fetch(TAVILY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_raw_content: false,
      }),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Tavily responded ${res.status}`)

    const data = await res.json() as {
      results?: Array<{ title?: string; url?: string; content?: string; score?: number }>
    }

    return (data.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.content?.slice(0, 300),
      score: r.score,
    }))
  } finally {
    clearTimeout(timeout)
  }
}

export async function summariseSources(
  topic: string,
  sources: ResearchSource[]
): Promise<string> {
  const formatted = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet ?? ''}`)
    .join('\n\n')

  const result = await callClaude({
    systemPrompt:
      'You are a research assistant. Given a topic and source snippets, produce a concise 150-200 word research brief that distills the most credible, relevant facts and any notable tensions or debates. Write as raw context — no opinions, no post language. Output only the brief.',
    userMessage: `Topic: ${topic}\n\nSources:\n${formatted}`,
    model: 'claude-haiku-4-5-20251001',
    maxTokens: 400,
  })

  return result.content.trim()
}

export async function researchTopic(
  topic: string
): Promise<{ sources: ResearchSource[]; summary: string }> {
  const sources = await searchTavily(topic)
  const summary = await summariseSources(topic, sources)
  return { sources, summary }
}
