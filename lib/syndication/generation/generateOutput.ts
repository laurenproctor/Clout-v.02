import { callClaude } from '@/lib/ai/generate'
import { buildGenerationSystemPrompt, buildGenerationUserMessage } from './generationPrompt'
import { PLATFORM_REGISTRY } from '../registry'
import type { Platform, SyndicationIntelligence, SyndicationOutput } from '../types/intelligence'

export interface DivergenceContext {
  alreadyGenerated: Platform[]
  generatedOpeners?: string[]   // first sentences of outputs already generated this session
  generatedAngles?: string[]    // core claims/angles already used
}

export async function generateOutput(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
  notes?: string,
  divergenceContext?: DivergenceContext,
): Promise<SyndicationOutput> {
  const maxTokens = PLATFORM_REGISTRY[platform].generation.maxTokens

  const result = await callClaude({
    systemPrompt: buildGenerationSystemPrompt(platform, intelligence, sourceUrl, notes, divergenceContext),
    userMessage: buildGenerationUserMessage(platform),
    model: 'claude-sonnet-4-6',
    maxTokens,
  })

  return {
    platform,
    content: result.content.trim(),
  }
}
