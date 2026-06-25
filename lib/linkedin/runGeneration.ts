// lib/linkedin/runGeneration.ts
import { callClaudeStream, campaignPromptLines } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import type { BrandContext } from '@/lib/brand/getBrandContext'
import type {
  LinkedInGenerationRequest,
  LinkedInGenerationResult,
  LinkedInVariation,
  LinkedInHook,
  PostCoaching,
} from '@/lib/linkedin/types'

export interface LinkedInPromptContext {
  request: LinkedInGenerationRequest
  lenses: Array<{ id: string; name: string; systemPrompt: string }>
  brandContext?: BrandContext
  campaignContext?: { goal: string; purpose: string | null } | null
}

export type { LinkedInPromptContext as _LinkedInPromptContextExport }

export const HASHTAG_COUNT = 5

// Common, broadly high-reach professional LinkedIn tags. Only used to top up a
// variation to HASHTAG_COUNT when the model returns fewer — never the primary source.
const FALLBACK_TAGS = [
  'leadership',
  'strategy',
  'growth',
  'business',
  'innovation',
  'careers',
  'marketing',
]

// Guarantee a variation always carries exactly HASHTAG_COUNT clean, distinct hashtags.
// Strips '#'/whitespace, drops blanks, de-duplicates case-insensitively, caps at the
// count, and backfills from FALLBACK_TAGS (skipping any already present) when short.
export function normalizeHashtags(raw: string[]): string[] {
  const seen = new Set<string>()
  const tags: string[] = []

  const add = (value: string) => {
    const tag = value.replace(/^#+/, '').trim()
    if (!tag) return
    const key = tag.toLowerCase()
    if (seen.has(key) || tags.length >= HASHTAG_COUNT) return
    seen.add(key)
    tags.push(tag)
  }

  for (const value of raw ?? []) add(value)
  for (const fallback of FALLBACK_TAGS) {
    if (tags.length >= HASHTAG_COUNT) break
    add(fallback)
  }

  return tags
}

interface ClaudeVariation {
  label: string
  campaignName: string
  body: string
  hooks: LinkedInHook[]
  hashtags: string[]
  ctaSuggestions: string[]
  transformationDelta: { changes: string[] }
}

interface ClaudeResponse {
  variations: ClaudeVariation[]
  coaching: PostCoaching
}

function buildSystemPrompt(ctx: LinkedInPromptContext): string {
  const lines: string[] = [
    '# LinkedIn Post Generation — Editorial Standards',
    '',
    'You are an expert LinkedIn ghostwriter. You produce scroll-stopping, platform-native posts that generate real engagement — not performative content.',
    '',
    '## AVOID',
    '- Dense paragraphs — break every 2–3 lines',
    '- Long intro setup before the core insight — lead with the claim',
    '- Generic motivational language ("Excited to share...", "This is a reminder that...")',
    '- Niche or obscure hashtags — use exactly 5, all common high-reach tags, placed at the end only',
    '- Obvious AI transitions ("In conclusion", "It\'s worth noting", "Furthermore")',
    '- Fake vulnerability framing ("I used to think X, but I was wrong...")',
    '- Repetitive cadence — vary sentence length intentionally',
    '',
    '## ENFORCE',
    '- Short paragraph cadence (1–3 lines max per block, blank lines between ideas)',
    '- Opening-line retention — first 2 lines must hook before "see more" truncation',
    '- Mobile scanning rhythm',
    '- Conversational readability at professional register',
    '- Comment-driving tension in the closing line',
    '- Audience-aware vocabulary and CTA style calibrated by the audience field',
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

  lines.push(...buildBrandVoicePromptBlock(ctx.brandContext))

  const campaignLines = campaignPromptLines(ctx.campaignContext)
  if (campaignLines.length > 0) {
    lines.push(...campaignLines, '')
  }

  lines.push('## Output Format')
  lines.push('Respond with ONLY valid JSON matching this exact schema:')
  lines.push('')
  lines.push(JSON.stringify({
    variations: [
      {
        label: 'Authority Version',
        campaignName: 'Why Most Teams Underestimate Technical Debt — Authority Angle',
        body: '...',
        hooks: [
          { type: 'statistical', text: '...' },
          { type: 'tension', text: '...' },
          { type: 'story', text: '...' },
          { type: 'contrarian', text: '...' },
        ],
        hashtags: ['leadership', 'strategy', 'operations', 'growth', 'management'],
        ctaSuggestions: ['What\'s your take?', 'Drop a comment below', 'DM me to discuss'],
        transformationDelta: { changes: ['Elevated authority framing', 'Direct claim opener'] },
      },
      { label: 'Narrative Version', campaignName: 'Why Most Teams Underestimate Technical Debt — Story Angle', body: '...', hooks: [], hashtags: [], ctaSuggestions: [], transformationDelta: { changes: [] } },
      { label: 'Debate Version', campaignName: 'Why Most Teams Underestimate Technical Debt — Debate Angle', body: '...', hooks: [], hashtags: [], ctaSuggestions: [], transformationDelta: { changes: [] } },
    ],
    coaching: {
      readerPsychology: {
        openingRetention: '...',
        dropOffRisks: ['...'],
        engagementDrivers: ['...'],
      },
      narrativeDynamics: {
        tensionMechanism: '...',
        pacingNotes: '...',
        closingStrength: '...',
      },
      positioningSignals: {
        authorityFraming: '...',
        audienceFit: '...',
        improvementSuggestions: ['...', '...'],
      },
    },
  }, null, 2))

  return lines.join('\n')
}

function buildUserMessage(request: LinkedInGenerationRequest): string {
  const lengthGuide: Record<string, string> = {
    short: '~150 words — punchy, minimal setup',
    medium: '~300 words — balanced depth and brevity',
    long: '~500 words — full argument, developed examples',
    executive_brief: '~100 words — crisp, high-signal lines only',
    story_format: '~400 words — narrative arc: scene → insight → implication',
  }

  const lines = [
    `## Post Brief`,
    ``,
    `**Post type:** ${request.postType}`,
    `**Intent:** ${request.intent}`,
    `**Narrative style:** ${request.narrativeStyle}`,
    `**Voice register:** ${request.voiceRegister}`,
    `**Target audience:** ${request.audience === 'custom' && request.customAudience ? request.customAudience : request.audience}`,
    `**Length:** ${request.length} — ${lengthGuide[request.length] ?? '~300 words'}`,
  ]

  if (request.sourceUrl) {
    lines.push(``, `## Source URL`, ``, request.sourceUrl, ``)
    lines.push(
      `**REQUIRED:** Every post variation body must end with this URL on its own line, preceded by a short contextual CTA.`,
      `Choose the CTA based on what the link offers (e.g. "Full breakdown:", "Read the research:", "See the full report:", "Get the details:").`,
      `Do not use generic CTAs like "Click here" or "Check it out". The CTA must match the content and feel native to the post's voice.`,
      `Format: CTA on one line, then the URL on the next line — both as plain text, no markdown.`,
    )
  }

  lines.push(
    ``,
    `## Source Content`,
    ``,
    request.sourceContent,
    ``,
    `## Instructions`,
    ``,
    `Generate exactly 3 variations:`,
    ``,
    `1. **Authority Version** — establishes credibility, positions author as expert. Lead with data, credentials, or a sharp declarative claim.`,
    `2. **Narrative Version** — leads with a story or relatable moment before the insight. Create a scene first, then extract the lesson.`,
    `3. **Debate Version** — opens with a contrarian claim or challenges a common belief. Make the reader disagree (or strongly agree) immediately.`,
    ``,
    `Each variation must include:`,
    `- campaignName: a compelling, specific headline (8–12 words) that describes what this post is about — used as the studio title. Format: "[Core insight or hook] — [Variation angle]". Do not use generic labels like "LinkedIn Post".`,
    `- 4 hook alternatives (one of each type: statistical, tension, story, contrarian)`,
    `- exactly 5 hashtags (no # prefix) — common, widely-followed tags that improve reach, not niche ones`,
    `- 3 CTA suggestions`,
    `- transformationDelta with 2–3 short labels describing what makes this variation distinct`,
    ``,
    `Also generate a coaching analysis for the overall content strategy.`,
  )

  return lines.join('\n')
}

function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('overloaded') || msg.includes('529') || msg.includes('overloaded_error')
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (isOverloaded(err)) return 'The AI is currently overloaded. Please try again in a moment.'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'Generation timed out — try a shorter source or fewer lenses.'
  if (msg.startsWith('{')) return 'Generation failed. Please try again.'
  return msg
}

export function runLinkedInGeneration(ctx: LinkedInPromptContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      async function generate(attempt: number): Promise<void> {
        const stream = callClaudeStream({
          systemPrompt: buildSystemPrompt(ctx),
          userMessage: buildUserMessage(ctx.request),
          maxTokens: 6000,
        })

        let accumulated = ''
        let chunkCount = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
            chunkCount++
            if (chunkCount === 30) emit({ type: 'progress', label: 'Writing post variations...' })
            if (chunkCount === 120) emit({ type: 'progress', label: 'Finalizing distribution variants' })
          }
        }

        const parsed = parseJson<ClaudeResponse>(accumulated)
        if (!Array.isArray(parsed?.variations) || !parsed?.coaching) {
          throw new Error('Claude returned an unexpected response structure. Try again.')
        }

        const variations: LinkedInVariation[] = parsed.variations.map((v) => ({
          id: crypto.randomUUID(),
          label: v.label,
          campaignName: v.campaignName ?? v.label,
          body: v.body,
          hooks: v.hooks,
          hashtags: normalizeHashtags(v.hashtags),
          mentions: [],
          ctaSuggestions: v.ctaSuggestions,
          transformationDelta: v.transformationDelta,
        }))

        emit({ type: 'complete', data: { variations } as LinkedInGenerationResult })
        emit({ type: 'coaching', data: parsed.coaching })
      }

      try {
        emit({ type: 'progress', label: 'Core thesis identified' })
        try {
          await generate(1)
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying...' })
            await new Promise(r => setTimeout(r, 3000))
            await generate(2)
          } else {
            throw err
          }
        }
      } catch (err) {
        emit({ type: 'error', message: friendlyError(err) })
      } finally {
        controller.close()
      }
    },
  })
}
