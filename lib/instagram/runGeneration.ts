import { callClaudeStream } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { resolveTemplateId, resolveAspectRatio } from './templates'
import type {
  InstagramGenerationRequest,
  InstagramVariation,
  InstagramSlide,
  ContentIntelligence,
  VisualPlan,
} from './types'

export interface InstagramPromptContext {
  request: InstagramGenerationRequest
  lenses: Array<{ id: string; name: string; systemPrompt: string }>
}

interface ClaudeSlide {
  position: number
  role: string
  headline: string
  body: string
}

interface ClaudeVariation {
  label: string
  campaignName: string
  caption: string
  hashtags: string[]
  slides: ClaudeSlide[]
  resolvedFormat: string
  resolvedStyle: string
  visualNarrative: string
  intelligence: {
    formatRationale: string
    captionStrategy: string
    visualNarrative: string
  }
}

interface ClaudeResponse {
  variations: ClaudeVariation[]
}

const SLIDE_STRUCTURES: Record<string, string[]> = {
  educational_carousel: ['hook', 'insight', 'supporting', 'supporting', 'supporting', 'cta'],
  quote_graphic:        ['hook'],
  framework:            ['problem', 'step', 'step', 'step', 'summary'],
  narrative_story:      ['hook', 'situation', 'tension', 'discovery', 'lesson', 'takeaway'],
  data_insight:         ['hook', 'context', 'implication', 'data', 'so_what', 'cta'],
}

function buildSystemPrompt(ctx: InstagramPromptContext): string {
  const lines: string[] = [
    '# Instagram Post Generation — Editorial Standards',
    '',
    'You are an expert Instagram content strategist and ghostwriter. You produce scroll-stopping, platform-native Instagram content — not generic social media fluff.',
    '',
    '## PLATFORM RULES',
    '- The first slide headline must stop the scroll — treat it like an email subject line',
    '- Slide headlines are short enough to read in 2 seconds (6 words max)',
    '- Slide body copy supports the headline — do not repeat it',
    '- Caption adds context and depth without summarizing every slide',
    '- Caption ends with an open question or directional CTA to drive comments',
    '- Hashtags: 5–10, mix of niche and broad, no # prefix, appended at the end of the caption',
    '',
    '## AVOID',
    '- Generic motivational openers ("Here\'s what I learned...", "This changed everything...")',
    '- Repeating slide content verbatim in the caption',
    '- Dense caption paragraphs — break every 2–3 lines',
    '- Hashtag stuffing or irrelevant tags',
    '- Slide body copy that is longer than 2 sentences',
    '',
    '## ENFORCE',
    '- Every slide must serve a structural purpose (hook, insight, cta, etc.)',
    '- Caption voice matches the visual style and intent',
    '- The final slide is always a CTA or takeaway — never an insight',
    '- Carousel flow builds momentum: each slide makes the reader want the next one',
    '',
  ]

  if (ctx.lenses.length > 0) {
    lines.push('## Editorial Lenses')
    for (const lens of ctx.lenses) {
      lines.push(`### ${lens.name}`)
      lines.push(lens.systemPrompt)
      lines.push('')
    }
  }

  const exampleSlide = { position: 1, role: 'hook', headline: 'The meeting was a mistake.', body: 'We had 12 people in the room and one agenda item that could have been a Slack message.' }
  const exampleVariation: ClaudeVariation = {
    label: 'Contrarian Angle',
    campaignName: 'Why Your Calendar Is the Real Productivity Problem — Contrarian Take',
    caption: 'Most people optimize their work.\n\nFewer people question whether the work itself is the problem.\n\nHere\'s what 3 years of async-first teams taught me about meetings...\n\nWhat\'s your no-meeting policy?',
    hashtags: ['productivity', 'leadership', 'asyncwork', 'remotework', 'teamculture'],
    slides: [
      exampleSlide,
      { position: 2, role: 'insight', headline: 'Meetings are a tax.', body: 'Every hour in a meeting is an hour not spent on the work that actually moves things forward.' },
      { position: 3, role: 'supporting', headline: 'Async scales.', body: 'Written context travels across time zones, survives turnover, and creates accountability.' },
      { position: 4, role: 'supporting', headline: 'The 3-question rule.', body: 'Before scheduling: Can this be a doc? A Loom? A Slack thread? If yes to any, don\'t schedule it.' },
      { position: 5, role: 'supporting', headline: 'Protect maker time.', body: 'Deep work requires uninterrupted blocks. Every meeting fragments your most valuable hours.' },
      { position: 6, role: 'cta', headline: 'Audit your calendar.', body: 'Count the recurring meetings. Then ask: what would break if we cancelled half of them?' },
    ],
    resolvedFormat: 'educational_carousel',
    resolvedStyle: 'editorial',
    visualNarrative: 'contrarian authority — challenges the default belief that more alignment = more meetings',
    intelligence: {
      formatRationale: 'Educational carousel fits because the content is process-driven with multiple discrete insights that build on each other.',
      captionStrategy: 'Opens with a reframe, delivers the punchline in slide 2, closes with a directional question to drive comments.',
      visualNarrative: 'Monochromatic editorial palette — high contrast, tight typography, no decorative elements. Authority without polish.',
    },
  }

  lines.push('## Output Format')
  lines.push('Respond with ONLY valid JSON matching this exact schema:')
  lines.push('')
  lines.push(JSON.stringify({ variations: [exampleVariation] }, null, 2))
  lines.push('')
  lines.push('CRITICAL: Return ONLY the JSON object. No markdown, no explanation, no code blocks.')

  return lines.join('\n')
}

function buildUserMessage(ctx: InstagramPromptContext): string {
  const { request } = ctx
  const format = request.visualFormat === 'let_clout_decide' ? 'auto' : request.visualFormat
  const style = request.visualStyle === 'auto' ? 'auto' : request.visualStyle

  const formatDescriptions: Record<string, string> = {
    educational_carousel: 'Educational Carousel — hook + 4 insights + CTA (6 slides)',
    quote_graphic:        'Quote Graphic — single slide centered around a memorable quote or observation',
    framework:            'Framework — visualize a methodology, process, or system (5 slides: problem → 3 steps → summary)',
    narrative_story:      'Narrative Story — hook, situation, tension, discovery, lesson, takeaway (6 slides)',
    data_insight:         'Data Insight — statistics, trends, and evidence (6 slides)',
    auto:                 'Let Clout Decide — select the strongest format for this content; populate resolvedFormat with your choice',
  }

  const styleDescriptions: Record<string, string> = {
    founder:   'Founder — raw, unpolished, direct. Monospace or system fonts. No decoration.',
    editorial: 'Editorial — clean, publication-grade. Serif or refined sans. Quiet authority.',
    luxury:    'Luxury — wide margins, minimal text, premium spacing. Let whitespace breathe.',
    modern:    'Modern — geometric sans-serif, tech-forward. Clean information design.',
    minimal:   'Minimal — almost nothing on screen. One idea per slide, no supporting copy.',
    bold:      'Bold — high-contrast, large type, solid color blocks. Maximum visual impact.',
    auto:      'Auto — Clout selects the style that best fits the content and intent; populate resolvedStyle with your choice',
  }

  const lines = [
    '## Instagram Post Brief',
    '',
    `**Visual format:** ${formatDescriptions[format] ?? format}`,
    `**Visual style:** ${styleDescriptions[style] ?? style}`,
    `**Intent:** ${request.intent}`,
    `**Target audience:** ${request.audience === 'custom' && request.customAudience ? request.customAudience : request.audience}`,
  ]

  if (request.sourceUrl) {
    lines.push('', '## Source URL', '', request.sourceUrl)
  }

  lines.push(
    '',
    '## Source Content',
    '',
    request.sourceContent,
    '',
    '## Instructions',
    '',
    'Generate exactly 2 variations of this Instagram post.',
    '',
    'Variation 1: Lead with the **authority angle** — credibility, data, or a sharp declarative claim as the hook.',
    'Variation 2: Lead with the **narrative angle** — a story, scene, or relatable moment before the insight.',
    '',
    'For each variation:',
    '- `label`: short descriptor of the angle (e.g. "Authority Angle", "Narrative Angle")',
    '- `campaignName`: compelling headline (8–12 words) describing what this post is — used as the studio title',
    '- `caption`: full Instagram caption with line breaks. DO NOT repeat slide headlines verbatim.',
    '- `hashtags`: 5–10 tags without # prefix',
    '- `slides`: array matching the format\'s slide structure exactly',
    '- `resolvedFormat`: the actual format used (important when format is "auto")',
    '- `resolvedStyle`: the actual style used (important when style is "auto")',
    '- `visualNarrative`: 1-sentence description of the visual direction and mood',
    '- `intelligence`: formatRationale, captionStrategy, visualNarrative (each 1–2 sentences)',
    '',
    format !== 'auto' ? `**Required slide structure for ${format}:** ${SLIDE_STRUCTURES[format]?.join(' → ') ?? 'hook → content → cta'}` : '**Since format is auto, choose the structure that best serves this content.**',
  )

  return lines.join('\n')
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10)
}

export function runInstagramGeneration(ctx: InstagramPromptContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  function emit(stream: WritableStreamDefaultWriter<Uint8Array>, event: object) {
    stream.write(encoder.encode(JSON.stringify(event) + '\n'))
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      const writer = {
        write: (chunk: Uint8Array) => { controller.enqueue(chunk) },
      } as WritableStreamDefaultWriter<Uint8Array>

      try {
        emit(writer, { type: 'progress', label: 'Analyzing your content...' })

        const systemPrompt = buildSystemPrompt(ctx)
        const userMessage = buildUserMessage(ctx)

        const stream = callClaudeStream({ systemPrompt, userMessage, maxTokens: 8000 })

        emit(writer, { type: 'progress', label: 'Crafting your Instagram package...' })

        let accumulated = ''
        let chunkCount = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
            chunkCount++
            if (chunkCount === 40) {
              emit(writer, { type: 'progress', label: 'Writing captions and slide copy...' })
            }
            if (chunkCount === 100) {
              emit(writer, { type: 'progress', label: 'Finalizing visual strategy...' })
            }
          }
        }

        const parsed = parseJson<ClaudeResponse>(accumulated)
        const rawVariations = parsed.variations ?? []

        const resolvedFormat = ctx.request.visualFormat === 'let_clout_decide'
          ? (rawVariations[0]?.resolvedFormat as InstagramGenerationRequest['visualFormat'] ?? 'educational_carousel')
          : ctx.request.visualFormat

        const resolvedStyle = ctx.request.visualStyle === 'auto'
          ? (rawVariations[0]?.resolvedStyle as InstagramGenerationRequest['visualStyle'] ?? 'editorial')
          : ctx.request.visualStyle

        const safeFormat = resolvedFormat === 'let_clout_decide' ? 'educational_carousel' : resolvedFormat

        const variations: InstagramVariation[] = rawVariations.map((v) => {
          const varResolvedFormat = v.resolvedFormat === 'let_clout_decide'
            ? 'educational_carousel'
            : (v.resolvedFormat as InstagramGenerationRequest['visualFormat'] ?? safeFormat)
          const varResolvedStyle = v.resolvedStyle === 'auto'
            ? 'editorial'
            : (v.resolvedStyle as InstagramGenerationRequest['visualStyle'] ?? resolvedStyle)
          const safeVarFormat = varResolvedFormat === 'let_clout_decide'
            ? 'educational_carousel'
            : varResolvedFormat

          const visualPlan: VisualPlan = {
            templateId:      resolveTemplateId(safeVarFormat, varResolvedStyle),
            styleId:         varResolvedStyle,
            visualNarrative: v.visualNarrative ?? '',
            aspectRatio:     resolveAspectRatio(safeVarFormat),
            slideLayouts:    (v.slides ?? []).map(s => ({ position: s.position, role: s.role })),
            renderEngine:    'html',
            renderTarget:    'instagram',
          }

          return {
            id:             generateId(),
            label:          v.label ?? 'Variation',
            campaignName:   v.campaignName ?? '',
            caption:        v.caption ?? '',
            hashtags:       v.hashtags ?? [],
            slides:         (v.slides ?? []) as InstagramSlide[],
            visualPlan,
            intelligence:   v.intelligence ?? { formatRationale: '', captionStrategy: '', visualNarrative: '' },
            resolvedFormat: varResolvedFormat,
            resolvedStyle:  varResolvedStyle,
          }
        })

        emit(writer, { type: 'complete', data: { variations } })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed'
        emit(writer, { type: 'error', message })
      } finally {
        controller.close()
      }
    },
  })

  return readable
}

// Re-export type used by the API route
export type { InstagramGenerationRequest }
