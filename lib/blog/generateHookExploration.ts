import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { HookExploration, NarrativeStrategy } from './types'

export async function generateHookExploration(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy
): Promise<{ result: HookExploration; inputTokens: number; outputTokens: number }> {
  const system = buildBlogSystemPrompt(ctx)
  const { request: r } = ctx

  const user = `Generate headline and hook options for this article.

Primary Keyword: ${r.primaryKeyword}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}
Content Angle: ${narrativeStrategy.contentAngle}

Return ONLY a JSON object matching this exact shape:
{
  "primaryAngle": "string — recommended editorial angle",
  "alternateAngles": ["string", "string"],
  "headlineOptions": [
    {
      "title": "string",
      "style": "contrarian" | "data-led" | "narrative" | "question" | "executive",
      "strength": 1-5,
      "why": "string — one sentence rationale for this angle"
    }
  ],
  "openingHooks": ["string", "string", "string"],
  "recommendedHeadline": "string — which headline to use and why (brief)"
}

Generate 4-5 headline options with genuinely distinct styles and angles.`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 1500 })
  const result = parseJson<HookExploration>(res.content)
  return { result, inputTokens: res.inputTokens, outputTokens: res.outputTokens }
}
