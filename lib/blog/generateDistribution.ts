import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy } from './types'

export async function generateDistribution(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  articleMarkdown: string,
  selectedHeadline: string
): Promise<{
  linkedin?: string
  xThread?: string
  newsletter?: string
  inputTokens: number
  outputTokens: number
}> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })

  const articleExcerpt = articleMarkdown.slice(0, 3000)

  const user = `Adapt this article for platform distribution. Apply platform psychology — not format reformatting.

Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}

Article excerpt:
${articleExcerpt}

Platform Psychology:
- LinkedIn: Foreground authority. Compress argument density. Optimize executive readability. Open with a directional claim, not a question. Signal strategic certainty and competence.
- X/Twitter: Maximize tension density. Shorten idea units. Increase contrast and velocity. Each tweet = one sharp idea. Thread builds to core argument from outside in.
- Newsletter: Increase intimacy. Write to one reader, not an audience. Optimize continuation likelihood. Create parasocial trust through specificity and directness.

Return ONLY a JSON object:
{
  "linkedin": "string — full LinkedIn post applying platform psychology",
  "xThread": "string — full X thread, tweets separated by \\n---\\n",
  "newsletter": "string — newsletter opening section applying platform psychology"
}`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 2500 })
  const result = parseJson<{ linkedin?: string; xThread?: string; newsletter?: string }>(res.content)
  return {
    linkedin: result.linkedin,
    xThread: result.xThread,
    newsletter: result.newsletter,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
  }
}
