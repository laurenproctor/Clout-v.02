import type { Platform, SyndicationIntelligence } from '../types/intelligence'
import { PLATFORM_REGISTRY } from '../registry'

interface DivergenceContext {
  alreadyGenerated: Platform[]
  generatedOpeners?: string[]
  generatedAngles?: string[]
}

function buildDivergenceClause(platform: Platform, ctx: DivergenceContext): string {
  if (ctx.alreadyGenerated.length === 0) return ''

  const platformLabel = PLATFORM_REGISTRY[platform].label
  const alreadyLines: string[] = []

  ctx.alreadyGenerated.forEach((p, i) => {
    const opener = ctx.generatedOpeners?.[i]
    const angle = ctx.generatedAngles?.[i]
    const pLabel = PLATFORM_REGISTRY[p].label
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

  return `You write platform-native posts that promote content and drive people to read it.

Your job: write a single post for ${model.platform.toUpperCase()} that teases the most compelling idea from this content and makes people want to click through.

${notesSection}${divergenceSection}## What you're promoting

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
  }
  return `Write a promotional post for ${platformNames[platform]}. Output only the final text.`
}
