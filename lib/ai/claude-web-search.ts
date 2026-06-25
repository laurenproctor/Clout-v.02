// ============================================================
// Claude web-search helper — preserves provenance (citations + usage),
// not flattened text. Used for agentic lookups like competitor channel
// discovery where the source URLs matter for validation/debugging.
// ============================================================
//
// Uses Anthropic's native server-side web-search tool `web_search_20250305`.
// NOTE: `web_search_20260209` exists in the installed SDK and may be preferred
// later for newer response inclusion / filtering; do not block on it.

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface WebSearchCitation {
  url: string
  title?: string
  cited_text?: string
}

export interface ClaudeWebSearchResult {
  text: string
  citations: WebSearchCitation[]
  usage: { web_search_requests: number; inputTokens: number; outputTokens: number }
}

export async function callClaudeWebSearch(params: {
  systemPrompt: string
  userMessage: string
  model?: string
  maxTokens?: number
  maxSearches?: number
}): Promise<ClaudeWebSearchResult> {
  const model = params.model ?? 'claude-sonnet-4-6'

  const response = await client.messages.create({
    model,
    max_tokens: params.maxTokens ?? 1500,
    system: params.systemPrompt,
    messages: [{ role: 'user', content: params.userMessage }],
    tools: [
      {
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: params.maxSearches ?? 3,
      },
    ],
  })

  let text = ''
  const citations: WebSearchCitation[] = []
  const seen = new Set<string>()
  const pushCitation = (c: WebSearchCitation) => {
    if (!c.url || seen.has(c.url)) return
    seen.add(c.url)
    citations.push(c)
  }

  for (const block of response.content) {
    if (block.type === 'text') {
      text += block.text
      for (const cit of block.citations ?? []) {
        if (cit.type === 'web_search_result_location') {
          pushCitation({ url: cit.url, title: cit.title ?? undefined, cited_text: cit.cited_text })
        }
      }
    } else if (block.type === 'web_search_tool_result') {
      const content = block.content
      if (Array.isArray(content)) {
        for (const r of content) {
          if (r.type === 'web_search_result') pushCitation({ url: r.url, title: r.title })
        }
      }
    }
  }

  return {
    text,
    citations,
    usage: {
      web_search_requests: response.usage.server_tool_use?.web_search_requests ?? 0,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
