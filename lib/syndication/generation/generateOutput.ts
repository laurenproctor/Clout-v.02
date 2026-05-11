import { callClaude } from '@/lib/ai/generate'
import { buildGenerationSystemPrompt, buildGenerationUserMessage } from './generationPrompt'
import type { Platform, SyndicationIntelligence, SyndicationOutput } from '../types/intelligence'
import type { SyndicationLens } from '../types/lenses'

const PLATFORM_MAX_TOKENS: Record<Platform, number> = {
  x: 512,
  linkedin: 800,
  substack: 1400,
  blog: 1600,
}

export async function generateOutput(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  lenses: SyndicationLens[],
  sourceUrl?: string,
): Promise<SyndicationOutput> {
  const result = await callClaude({
    systemPrompt: buildGenerationSystemPrompt(platform, intelligence, lenses, sourceUrl),
    userMessage: buildGenerationUserMessage(platform),
    model: 'claude-sonnet-4-6',
    maxTokens: PLATFORM_MAX_TOKENS[platform],
  })

  return {
    platform,
    content: result.content.trim(),
  }
}
