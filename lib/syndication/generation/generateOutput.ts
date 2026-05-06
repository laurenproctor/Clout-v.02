import { callClaude } from '@/lib/ai/generate'
import { buildGenerationSystemPrompt, buildGenerationUserMessage } from './generationPrompt'
import type { Platform, SyndicationIntelligence, SyndicationOutput } from '../types/intelligence'
import type { SyndicationLens } from '../types/lenses'

export async function generateOutput(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  lenses: SyndicationLens[],
): Promise<SyndicationOutput> {
  const result = await callClaude({
    systemPrompt: buildGenerationSystemPrompt(platform, intelligence, lenses),
    userMessage: buildGenerationUserMessage(platform),
    model: 'claude-sonnet-4-6',
    maxTokens: 2048,
  })

  return {
    platform,
    content: result.content.trim(),
  }
}
