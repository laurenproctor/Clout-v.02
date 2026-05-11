import { callClaude } from '@/lib/ai/generate'
import { buildGenerationSystemPrompt, buildGenerationUserMessage } from './generationPrompt'
import type { Platform, SyndicationIntelligence, SyndicationOutput } from '../types/intelligence'

const PLATFORM_MAX_TOKENS: Record<Platform, number> = {
  x: 160,
  linkedin: 800,
  substack: 1400,
  blog: 1600,
}

export async function generateOutput(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
  notes?: string,
): Promise<SyndicationOutput> {
  const result = await callClaude({
    systemPrompt: buildGenerationSystemPrompt(platform, intelligence, sourceUrl, notes),
    userMessage: buildGenerationUserMessage(platform),
    model: 'claude-sonnet-4-6',
    maxTokens: PLATFORM_MAX_TOKENS[platform],
  })

  return {
    platform,
    content: result.content.trim(),
  }
}
