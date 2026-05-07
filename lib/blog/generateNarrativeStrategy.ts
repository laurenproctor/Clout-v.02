import { parseJson } from './parseJson'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt, type BlogPromptContext } from './buildBlogPrompt'
import type { NarrativeStrategy } from './types'

export async function generateNarrativeStrategy(
  ctx: BlogPromptContext
): Promise<{ result: NarrativeStrategy; inputTokens: number; outputTokens: number }> {
  const system = buildBlogSystemPrompt(ctx)
  const { request: r } = ctx

  const user = `Build the narrative strategy for a ${r.goalType.replace(/_/g, ' ')} article.

Primary Keyword: ${r.primaryKeyword}
${r.sourceContent ? `Source Content:\n${r.sourceContent.slice(0, 2000)}` : ''}

Return ONLY a JSON object matching this exact shape:
{
  "coreArgument": "string — the central thesis, a clear position in one sentence",
  "opposingView": "string — what belief this content challenges (optional but preferred)",
  "tension": "string — the conflict or paradox at the heart of the piece",
  "stakes": "string — what is at risk if the reader does not shift their thinking",
  "thesisStrength": "safe" | "moderate" | "strong",
  "audienceBeliefShift": "string — what the reader believes differently after reading",
  "emotionalDrivers": ["string"],
  "proofMechanisms": ["string"],
  "contentAngle": "string — differentiated entry point vs generic treatment"
}`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: 1500 })
  const result = parseJson<NarrativeStrategy>(res.content)
  return { result, inputTokens: res.inputTokens, outputTokens: res.outputTokens }
}
