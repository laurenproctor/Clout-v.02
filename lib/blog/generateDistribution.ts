import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy } from './types'

export type SocialPlatform = 'linkedin' | 'xThread' | 'newsletter'

export async function generateDistribution(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  articleMarkdown: string,
  selectedHeadline: string,
  platforms: SocialPlatform[] = ['linkedin', 'xThread', 'newsletter']
): Promise<{
  linkedin?: string
  xThread?: string
  newsletter?: string
  inputTokens: number
  outputTokens: number
}> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })

  const articleExcerpt = articleMarkdown.slice(0, 3000)

  const platformInstructions: Record<SocialPlatform, string> = {
    linkedin: '- LinkedIn: Foreground authority. Compress argument density. Optimize executive readability. Open with a directional claim, not a question. Signal strategic certainty and competence.',
    xThread: '- X/Twitter: Maximize tension density. Shorten idea units. Increase contrast and velocity. Each tweet = one sharp idea. Thread builds to core argument from outside in.',
    newsletter: '- Newsletter: Increase intimacy. Write to one reader, not an audience. Optimize continuation likelihood. Create parasocial trust through specificity and directness.',
  }

  const schemaFields: Record<SocialPlatform, string> = {
    linkedin: '  "linkedin": "string — full LinkedIn post applying platform psychology"',
    xThread: '  "xThread": "string — full X thread, tweets separated by \\n---\\n"',
    newsletter: '  "newsletter": "string — newsletter opening section applying platform psychology"',
  }

  const user = `Adapt this article for platform distribution. Apply platform psychology — not format reformatting.

Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}

Article excerpt:
${articleExcerpt}

Platform Psychology:
${platforms.map(p => platformInstructions[p]).join('\n')}

Return ONLY a JSON object with these fields:
{
${platforms.map(p => schemaFields[p]).join(',\n')}
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
