import type { Platform, SyndicationIntelligence } from '../types/intelligence'
import { X_PLATFORM_MODEL } from '../platforms/x'
import { LINKEDIN_PLATFORM_MODEL } from '../platforms/linkedin'
import { SUBSTACK_PLATFORM_MODEL } from '../platforms/substack'
import { BLOG_PLATFORM_MODEL } from '../platforms/blog'

const PLATFORM_MODELS = {
  x: X_PLATFORM_MODEL,
  linkedin: LINKEDIN_PLATFORM_MODEL,
  substack: SUBSTACK_PLATFORM_MODEL,
  blog: BLOG_PLATFORM_MODEL,
}

export function buildGenerationSystemPrompt(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
): string {
  const model = PLATFORM_MODELS[platform]

  const preWriting = 'preWritingFramework' in model
    ? `## Before writing\n\n${(model as typeof model & { preWritingFramework: string }).preWritingFramework}\n\n`
    : ''

  const sourceLinkSection = (platform === 'x' && sourceUrl)
    ? `## Source link\n\nEnd the post with the source URL on its own line, preceded by a short lead-in. Pick whichever fits the tone:\n- "Read the full piece: ${sourceUrl}"\n- "Full piece → ${sourceUrl}"\n- "Worth reading: ${sourceUrl}"\n\nThe link must be the very last line.\n\n`
    : (sourceUrl && platform !== 'x')
    ? `## Source link\n\nReference the source naturally in the post: ${sourceUrl}\n\n`
    : ''

  return `You write platform-native posts that promote content and drive people to read it.

Your job: write a single post for ${model.platform.toUpperCase()} that teases the most compelling idea from this content and makes people want to click through.

## What you're promoting

**Core idea:** ${intelligence.thesis}

**Audience:** ${intelligence.audience}

**What makes it worth reading:** ${intelligence.spreadability_patterns.join('; ')}

**Key quote to consider using:** ${intelligence.key_quotes[0] ?? ''}

${preWriting}## Platform: ${model.platform.toUpperCase()}

${model.rhetoricalEnvironment}

### Rules
${model.structuralRules.map(r => `- ${r}`).join('\n')}

### Target length
${model.lengthTarget}

### Don't do these
${model.antiPatterns.map(a => `- ${a}`).join('\n')}

${sourceLinkSection}## Output

Return only the post text. No preamble, no explanation, no metadata.`
}

export function buildGenerationUserMessage(platform: Platform): string {
  const platformNames: Record<Platform, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    substack: 'Substack newsletter',
    blog: 'blog post',
  }
  return `Write a promotional post for ${platformNames[platform]}. Output only the final text.`
}
