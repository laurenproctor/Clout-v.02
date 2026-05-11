import type { Platform, SyndicationIntelligence } from '../types/intelligence'
import type { SyndicationLens } from '../types/lenses'
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
  lenses: SyndicationLens[],
): string {
  const model = PLATFORM_MODELS[platform]

  const lensSection = lenses.length > 0
    ? `\n## Active lenses\n\nThe following rhetorical lenses have been selected. Apply them as framing modifiers — they shape HOW the content is expressed, not WHAT it says.\n\n${lenses.map(l => `**${l.name}:** ${l.rhetoricalModifier}`).join('\n\n')}`
    : ''

  const platformRisk = intelligence.platform_risks[platform]
  const riskNote = platformRisk
    ? `\n## Adaptation challenge\n\n${platformRisk}\n\nAcknowledge this challenge in your reconstruction — work around it, don't ignore it.`
    : ''

  const preWriting = 'preWritingFramework' in model
    ? `\n## Pre-writing framework\n\n${(model as typeof model & { preWritingFramework: string }).preWritingFramework}\n`
    : ''

  return `You are a platform-native content reconstruction engine. You do NOT rewrite content. You reconstruct it — preserving its persuasive intelligence while rebuilding its structure, pacing, and expression for a specific rhetorical environment.

## Source intelligence

You have been given a structured analysis of the source content. This is your only input. Do not invent facts. Do not exceed what the source intelligence supports.

**Thesis:** ${intelligence.thesis}

**Tone:** ${intelligence.tone}

**Audience:** ${intelligence.audience}

**Persuasive mechanics:** ${intelligence.persuasive_mechanics.join('; ')}

**Authority style:** ${intelligence.authority_style}

**Emotional style:** ${intelligence.emotional_style}

**Spreadability patterns:** ${intelligence.spreadability_patterns.join('; ')}

**Narrative style:** ${intelligence.narrative_style}

**Adaptation constraints:** ${intelligence.adaptation_constraints.join('; ')}

**Key quotes (preserve these if they survive compression):**
${intelligence.key_quotes.map(q => `- "${q}"`).join('\n')}

${preWriting}## Platform: ${model.platform.toUpperCase()}

${model.rhetoricalEnvironment}

### Structural rules
${model.structuralRules.map(r => `- ${r}`).join('\n')}

### Target length
${model.lengthTarget}

### Anti-patterns (never do these)
${model.antiPatterns.map(a => `- ${a}`).join('\n')}
${lensSection}${riskNote}

## Hard constraints (apply to all platforms)

- NEVER produce content that feels summarized, templated, or AI-generated
- NEVER open with the author's name, "I", or self-referential framing unless it serves the hook
- NEVER use "Here are N lessons/things/ways"
- NEVER use empty hooks: "This changed everything", "I wish someone told me this"
- NEVER preserve the source's sentence order — reconstruct, do not rearrange
- NEVER add hashtags unless the platform requires them (blog only: none; X: max 1 if natural)
- The output must feel independently written for ${model.platform}, not adapted FROM somewhere else

## Output format

Return ONLY the final content. No preamble, no explanation, no metadata. Just the post/essay/article text ready to be copied and used.`
}

export function buildGenerationUserMessage(platform: Platform): string {
  const platformNames: Record<Platform, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    substack: 'Substack newsletter',
    blog: 'blog post',
  }
  return `Reconstruct this content for ${platformNames[platform]}. Output only the final text.`
}
