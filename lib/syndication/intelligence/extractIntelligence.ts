import { callClaude } from '@/lib/ai/generate'
import { buildIntelligenceSystemPrompt, buildIntelligenceUserMessage } from './intelligencePrompt'
import type { ExtractedContent } from '@/lib/syndicate/types/analysis'
import type { SyndicationIntelligence } from '../types/intelligence'

export async function extractIntelligence(
  extracted: ExtractedContent,
): Promise<SyndicationIntelligence> {
  const result = await callClaude({
    systemPrompt: buildIntelligenceSystemPrompt(),
    userMessage: buildIntelligenceUserMessage({
      title: extracted.title,
      text: extracted.content,
    }),
    model: 'claude-sonnet-4-6',
    maxTokens: 1024,
  })

  let parsed: unknown
  try {
    // Strip markdown code fences if present
    const clean = result.content.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    parsed = JSON.parse(clean)
  } catch {
    throw new Error('INTELLIGENCE_PARSE_FAILED: Could not parse intelligence object')
  }

  // Basic shape validation
  const obj = parsed as Record<string, unknown>
  if (
    typeof obj.thesis !== 'string' ||
    typeof obj.tone !== 'string' ||
    !Array.isArray(obj.persuasive_mechanics)
  ) {
    throw new Error('INTELLIGENCE_INVALID: Missing required fields')
  }

  return obj as unknown as SyndicationIntelligence
}
