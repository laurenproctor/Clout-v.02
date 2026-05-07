import type { BlogGenerationRequest } from './types'

export interface LensContext {
  id: string
  name: string
  systemPrompt: string
}

export interface BlogPromptContext {
  request: BlogGenerationRequest
  lenses: LensContext[]
  selectedHeadline?: string
}

export function buildBlogSystemPrompt(ctx: BlogPromptContext): string {
  const { request: r, lenses } = ctx

  // Derive narrativeTemperature from goalType + opinionStrength (hidden orchestration, not user-visible)
  const temperature = deriveNarrativeTemperature(r.goalType, r.opinionStrength)

  const lines: string[] = []

  lines.push('You are an expert editorial strategist and thought leadership writer.')
  lines.push('')

  if (lenses.length > 0) {
    lines.push('## Lens System')
    lines.push('Apply the following editorial lenses to shape perspective, framing, and analysis:')
    lenses.forEach(l => {
      lines.push(`\n### ${l.name}`)
      lines.push(l.systemPrompt)
    })
    lines.push('')
  }

  lines.push('## Editorial Parameters')
  lines.push(`Goal: ${r.goalType.replace(/_/g, ' ')}`)
  lines.push(`Audience: ${r.audienceIdentity}`)
  lines.push(`Opinion Strength: ${r.opinionStrength}`)
  lines.push(`Narrative Temperature: ${temperature}`)
  lines.push(`Brand Voice: ${r.brandVoice}`)
  lines.push(`Tone: ${r.tone}`)
  lines.push(`Reading Level: ${r.readingLevel}`)
  lines.push(`Length Target: ${r.length}`)
  lines.push('')

  lines.push('## Audience Context')
  lines.push(`Writing for: ${r.audienceIdentity}`)
  const audienceGuidance: Record<string, string> = {
    founder: 'Prioritize strategic leverage, market timing, and asymmetric opportunity.',
    operator: 'Focus on implementation, process improvement, and operational leverage.',
    executive: 'Foreground strategic risk, competitive positioning, and organizational implications.',
    investor: 'Emphasize market dynamics, moat analysis, and conviction signals.',
    strategist: 'Lead with frameworks, second-order thinking, and differentiated analysis.',
    engineer: 'Respect technical depth, precise language, and concrete implementations.',
    creator: 'Emphasize narrative craft, audience psychology, and distribution leverage.',
    researcher: 'Prioritize rigor, nuance, evidence quality, and epistemic care.',
  }
  lines.push(audienceGuidance[r.audienceIdentity] ?? '')
  lines.push('')

  lines.push('## Opinion Strength Guidance')
  const opinionGuidance: Record<string, string> = {
    safe: 'Take balanced, well-supported positions. Avoid controversy. Build credibility through thoroughness.',
    assertive: 'Hold clear positions with confidence. Acknowledge counterarguments but defend your stance.',
    provocative: 'Challenge conventional wisdom. Make claims that will surprise or discomfort some readers.',
    industry_challenging: 'Directly challenge dominant industry narratives. Be willing to name what others avoid.',
  }
  lines.push(opinionGuidance[r.opinionStrength] ?? '')
  lines.push('')

  lines.push('## Narrative Temperature Guidance')
  const tempGuidance: Record<string, string> = {
    analytical: 'Maintain intellectual precision. Use evidence and logic as primary drivers. Restrained but sharp.',
    urgent: 'Convey stakes and immediacy. The reader needs to act or think differently now.',
    optimistic: 'Signal genuine possibility and forward momentum. Hopeful but grounded.',
    skeptical: 'Question assumptions rigorously. Default to healthy doubt over easy conclusions.',
    confrontational: 'Do not soften edges. Name contradictions. Challenge the reader directly.',
    reflective: 'Thoughtful, measured cadence. Invite the reader to think alongside you.',
    visionary: 'Paint the shape of what is becoming. Think in systems and trajectories.',
  }
  lines.push(tempGuidance[temperature] ?? '')
  lines.push('')

  if (r.title) {
    lines.push('## Requested Title')
    lines.push(`"${r.title}"`)
    lines.push('Use this as the basis for headline development. Adapt or refine it — do not ignore it.')
    lines.push('')
  }

  if (ctx.selectedHeadline) {
    lines.push('## Confirmed Headline')
    lines.push(`"${ctx.selectedHeadline}"`)
    lines.push('All content must align with and serve this headline.')
    lines.push('')
  }

  if (r.additionalContext) {
    lines.push('## Additional Instructions')
    lines.push(r.additionalContext)
    lines.push('')
  }

  return lines.join('\n')
}

function deriveNarrativeTemperature(
  goalType: BlogGenerationRequest['goalType'],
  opinionStrength: BlogGenerationRequest['opinionStrength']
): BlogGenerationRequest['narrativeTemperature'] {
  if (opinionStrength === 'industry_challenging') return 'confrontational'
  if (opinionStrength === 'provocative') return 'skeptical'

  const map: Record<string, BlogGenerationRequest['narrativeTemperature']> = {
    thought_leadership: 'visionary',
    commentary: 'confrontational',
    news_reaction: 'urgent',
    seo: 'analytical',
    evergreen_guide: 'analytical',
    case_study: 'reflective',
    product_education: 'analytical',
    comparison: 'analytical',
  }
  return map[goalType] ?? 'analytical'
}
