import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy, OutlineSection } from './types'

export async function generateOutline(
  ctx: BlogPromptContext,
  narrativeStrategy: NarrativeStrategy,
  selectedHeadline: string
): Promise<{ result: OutlineSection[]; inputTokens: number; outputTokens: number }> {
  const system = buildBlogSystemPrompt({ ...ctx, selectedHeadline })
  const { request: r } = ctx

  const lengthWords: Record<string, number> = {
    short: 800,
    standard: 1500,
    long: 2500,
    pillar: 4000,
  }
  const targetWords = lengthWords[r.length] ?? 1500

  const user = `Create the content outline for this article.

Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}
Tension: ${narrativeStrategy.tension}
Stakes: ${narrativeStrategy.stakes}
Proof Mechanisms: ${narrativeStrategy.proofMechanisms.join(', ')}
Target Length: ~${targetWords} words
FAQ Section: ${r.toggles.faqSection}
Key Takeaways: ${r.toggles.keyTakeaways}
TL;DR: ${r.toggles.tldr}

Build the outline around the argument, not keyword lists. Each section should advance the core argument.

Return ONLY a JSON array of OutlineSection objects:
[
  {
    "heading": "string",
    "level": "h2" | "h3",
    "purpose": "string — what this section does for the argument",
    "keyPoints": ["string"],
    "estimatedWords": number
  }
]`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 4000 })
  const result = parseJson<OutlineSection[]>(res.content)
  return { result, inputTokens: res.inputTokens, outputTokens: res.outputTokens }
}
