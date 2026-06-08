import type { Platform, SyndicationIntelligence } from '../types/intelligence'
import { PLATFORM_REGISTRY } from '../registry'

interface DivergenceContext {
  alreadyGenerated: Platform[]
  generatedOpeners?: string[]
  generatedAngles?: string[]
}

function buildDivergenceClause(platform: Platform, ctx: DivergenceContext): string {
  if (ctx.alreadyGenerated.length === 0) return ''

  const platformLabel = PLATFORM_REGISTRY[platform].identity.label
  const alreadyLines: string[] = []

  ctx.alreadyGenerated.forEach((p, i) => {
    const opener = ctx.generatedOpeners?.[i]
    const angle = ctx.generatedAngles?.[i]
    const pLabel = PLATFORM_REGISTRY[p].identity.label
    if (opener || angle) {
      alreadyLines.push(`- ${pLabel}: "${opener ?? angle}"`)
    } else {
      alreadyLines.push(`- ${pLabel}`)
    }
  })

  return `## Divergence

The following platforms have already been generated for this content:
${alreadyLines.join('\n')}

Your ${platformLabel} post must not repeat these angles, openers, or claims. Choose a genuinely different observation — a different emotional entry point, a different rhetorical move. The reader should encounter a different thought, not the same idea repackaged in a different format.

`
}

export function buildGenerationSystemPrompt(
  platform: Platform,
  intelligence: SyndicationIntelligence,
  sourceUrl?: string,
  notes?: string,
  divergenceContext?: DivergenceContext,
): string {
  const def = PLATFORM_REGISTRY[platform]
  const model = def.model

  const notesSection = notes?.trim()
    ? `## Angle and direction\n\nThe user has provided specific instructions for how to approach this post. Follow them closely — they override default framing choices:\n\n${notes.trim()}\n\n`
    : ''

  const preWriting = model.preWritingFramework
    ? `## Before writing\n\n${model.preWritingFramework}\n\n`
    : ''

  const hashtagSection = model.hashtagRule
    ? `## Hashtags\n\n${model.hashtagRule}\n\n`
    : ''

  const sourceLinkSection = (sourceUrl && (platform === 'x' || platform === 'threads'))
    ? `## Source link\n\nEnd the post with the source URL on its own line, preceded by a short lead-in. Pick whichever fits the tone:\n- "Read the full piece: ${sourceUrl}"\n- "Full piece → ${sourceUrl}"\n- "Worth reading: ${sourceUrl}"\n\nThe link must be the very last line. Include the full URL exactly as given — do not truncate or shorten it.\n\n`
    : (sourceUrl && platform !== 'x' && platform !== 'threads')
    ? `## Source link\n\nReference the source naturally in the post: ${sourceUrl}\n\n`
    : ''

  const divergenceSection = divergenceContext
    ? buildDivergenceClause(platform, divergenceContext)
    : ''

  const isGBP = platform === 'google_business_profile'

  const intro = isGBP
    ? `You write local business posts for Google Business Profile — a search visibility surface, not a social network.

Your job: write a single Local Update that gives customers discovering this business through search a compelling operational reason to engage. This is not content promotion. This is local trust distribution.

Write like a credible local business communicating directly with customers discovering the business through search. Optimize for clarity, trust, relevance, and immediacy. Prioritize specificity, operational clarity, concise usefulness, and local relevance. Avoid inflated marketing language, vague thought leadership, excessive formatting, and hashtag stuffing.`
    : `You write platform-native posts that promote content and drive people to read it.

Your job: write a single post for ${model.platform.toUpperCase()} that teases the most compelling idea from this content and makes people want to click through.`

  const whatYourePromoting = isGBP
    ? `## Source material

**Core idea:** ${intelligence.thesis}

**Audience:** ${intelligence.audience}

**Key insight to consider:** ${intelligence.key_quotes[0] ?? intelligence.thesis}

Adapt this into a local business update — not a promotional post about the source, but an operational local update informed by these ideas.`
    : `## What you're promoting

**Core idea:** ${intelligence.thesis}

**Audience:** ${intelligence.audience}

**What makes it worth reading:** ${intelligence.spreadability_patterns.join('; ')}

**Key quote to consider using:** ${intelligence.key_quotes[0] ?? ''}`

  return `${intro}

${notesSection}${divergenceSection}${whatYourePromoting}

${preWriting}## Platform: ${isGBP ? 'GOOGLE BUSINESS PROFILE' : model.platform.toUpperCase()}

${model.rhetoricalEnvironment}

### Rules
${model.structuralRules.map(r => `- ${r}`).join('\n')}

### Target length
${model.lengthTarget}

### Don't do these
${model.antiPatterns.map(a => `- ${a}`).join('\n')}

${hashtagSection}${sourceLinkSection}## Output

Return only the post text. No preamble, no explanation, no metadata.`
}

export function buildGenerationUserMessage(platform: Platform): string {
  const platformNames: Record<Platform, string> = {
    x: 'X (Twitter)',
    linkedin: 'LinkedIn',
    substack: 'Substack newsletter',
    blog: 'blog post',
    threads: 'Threads',
    facebook: 'Facebook post',
    google_business_profile: 'Google Business Profile',
    medium: 'Medium article',
    bluesky: 'Bluesky',
  }
  const verb = platform === 'google_business_profile' ? 'Write a Local Update for' : 'Write a promotional post for'
  return `${verb} ${platformNames[platform]}. Output only the final text.`
}
