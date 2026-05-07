import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy } from './types'

export async function generateMetadata(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  selectedHeadline: string
): Promise<{
  result: { metaTitle: string; metaDescription: string; slug: string }
  inputTokens: number
  outputTokens: number
}> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })
  const { request: r } = ctx

  const user = `Write SEO metadata for this article.

Headline: ${selectedHeadline}
Primary Keyword: ${r.primaryKeyword}
Core Argument: ${narrativeStrategy.coreArgument}
Content Angle: ${narrativeStrategy.contentAngle}

Return ONLY a JSON object:
{
  "metaTitle": "string — 50-60 chars, includes primary keyword",
  "metaDescription": "string — 150-160 chars, compelling, keyword-rich",
  "slug": "string — URL-safe slug, 3-6 words, primary keyword first"
}`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 500 })
  const result = JSON.parse(res.content)
  return { result, inputTokens: res.inputTokens, outputTokens: res.outputTokens }
}
