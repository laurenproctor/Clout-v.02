// lib/linkedin/runGeneration.ts
import { callClaude, callClaudeStream, campaignPromptLines } from '@/lib/ai/generate'
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

interface ClaudeVariationsResponse {
  variations: ClaudeVariation[]
}

// Shared editorial-standards + lenses + brand + campaign prefix. Both the anchor
// (one recommended post) and the alternates (other angles) prompts build on this;
// only the trailing output-format schema differs.
function buildPromptPrefix(ctx: LinkedInPromptContext): string[] {
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

  return lines
}

function buildSystemPrompt(ctx: LinkedInPromptContext): string {
  const lines = buildPromptPrefix(ctx)

  lines.push('## Output Format')
  lines.push('Respond with ONLY valid JSON matching this exact schema (a single recommended post in a one-element array):')
  lines.push('')
  lines.push(JSON.stringify({
    variations: [
      {
        label: 'Recommended',
        campaignName: 'Why Most Teams Underestimate Technical Debt — Recommended',
        body: '...',
        hooks: [
          { type: 'statistical', text: '...' },
          { type: 'tension', text: '...' },
          { type: 'story', text: '...' },
          { type: 'contrarian', text: '...' },
        ],
        hashtags: ['leadership', 'strategy', 'operations', 'growth', 'management'],
        ctaSuggestions: ['What\'s your take?', 'Drop a comment below', 'DM me to discuss'],
        transformationDelta: { changes: ['Strongest angle for this brief', 'Direct claim opener'] },
      },
    ],
  }, null, 2))

  return lines.join('\n')
}

// Coaching is generated by a SEPARATE, parallel call so it never sits on the
// critical path of the user-facing variations. It's a compact strategist prompt
// (no full editorial standards) returning only the coaching object.
function buildCoachingSystemPrompt(): string {
  return [
    '# LinkedIn Content Strategy — Coaching Analysis',
    '',
    'You are a LinkedIn content strategist. Given a post brief and source material,',
    'produce a concise coaching analysis of how content on this topic should perform —',
    'reader psychology, narrative dynamics, and positioning. Be specific and practical.',
    '',
    '## Output Format',
    'Respond with ONLY valid JSON matching this exact schema:',
    '',
    JSON.stringify({
      readerPsychology: { openingRetention: '...', dropOffRisks: ['...'], engagementDrivers: ['...'] },
      narrativeDynamics: { tensionMechanism: '...', pacingNotes: '...', closingStrength: '...' },
      positioningSignals: { authorityFraming: '...', audienceFit: '...', improvementSuggestions: ['...', '...'] },
    }, null, 2),
  ].join('\n')
}

function buildCoachingUserMessage(request: LinkedInGenerationRequest): string {
  const audience = request.audience === 'custom' && request.customAudience ? request.customAudience : request.audience
  return [
    '## Post Brief',
    '',
    `**Intent:** ${request.intent}`,
    `**Target audience:** ${audience}`,
    '',
    '## Source Content',
    '',
    request.sourceContent,
    '',
    '## Instructions',
    '',
    'Produce a coaching analysis for content on this topic and audience. Coaching only — do not write posts.',
  ].join('\n')
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
    `Write ONE recommended post — the single strongest version for this brief. Do not produce multiple variations.`,
    ``,
    `Choose the angle that will perform best for this specific source, intent, and audience. Common angles to weigh (pick exactly one, whichever is strongest — do not default to authority):`,
    `- **Authority** — lead with data, credentials, or a sharp declarative claim.`,
    `- **Narrative** — open with a story or relatable moment, then extract the lesson.`,
    `- **Debate** — open with a contrarian claim that challenges a common belief.`,
    ``,
    `Return it as a one-element "variations" array. The post must include:`,
    `- label: "Recommended"`,
    `- campaignName: a compelling, specific headline (8–12 words) that describes what this post is about — used as the studio title. Do not use generic labels like "LinkedIn Post".`,
    `- 4 hook alternatives (one of each type: statistical, tension, story, contrarian)`,
    `- exactly 5 hashtags (no # prefix) — common, widely-followed tags that improve reach, not niche ones`,
    `- 3 CTA suggestions`,
    `- transformationDelta with 2–3 short labels describing the angle chosen and why it fits`,
  )

  return lines.join('\n')
}

// Alternates are an explicit, on-demand second intent: given the already-shown
// anchor, produce two genuinely different angles so the user can inspect other
// strategic directions. Same editorial standards; a two-element output schema.
function buildAlternatesSystemPrompt(ctx: LinkedInPromptContext): string {
  const lines = buildPromptPrefix(ctx)

  lines.push('## Output Format')
  lines.push('Respond with ONLY valid JSON matching this exact schema (exactly two alternate posts):')
  lines.push('')
  lines.push(JSON.stringify({
    variations: [
      {
        label: 'Alternate angle',
        campaignName: 'Why Most Teams Underestimate Technical Debt — Story Angle',
        body: '...',
        hooks: [
          { type: 'statistical', text: '...' },
          { type: 'tension', text: '...' },
          { type: 'story', text: '...' },
          { type: 'contrarian', text: '...' },
        ],
        hashtags: ['leadership', 'strategy', 'operations', 'growth', 'management'],
        ctaSuggestions: ['What\'s your take?', 'Drop a comment below', 'DM me to discuss'],
        transformationDelta: { changes: ['Narrative-first opener', 'Distinct from the recommended post'] },
      },
      { label: 'Alternate angle', campaignName: 'Why Most Teams Underestimate Technical Debt — Debate Angle', body: '...', hooks: [], hashtags: [], ctaSuggestions: [], transformationDelta: { changes: [] } },
    ],
  }, null, 2))

  return lines.join('\n')
}

function buildAlternatesUserMessage(request: LinkedInGenerationRequest, anchorBody: string): string {
  return [
    buildUserMessage(request),
    ``,
    `## Already-recommended post (do NOT repeat this angle)`,
    ``,
    anchorBody,
    ``,
    `## Alternate-angles instruction`,
    ``,
    `The post above is the recommended version the user has already seen. Now produce TWO alternate posts that take genuinely different angles from it and from each other — e.g. if the recommended post is narrative, offer an authority and a debate angle.`,
    `Each alternate must stand on its own as a strong post, follow all editorial standards, and include the same fields (label "Alternate angle", campaignName, 4 hook alternatives, exactly 5 hashtags, 3 CTA suggestions, and a transformationDelta of 2–3 short labels describing how it differs from the recommended post).`,
  ].join('\n')
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

      // Generate the user-facing variations. This is the critical path — kept lean
      // (variations only, no coaching) so it returns as fast as possible.
      async function generateVariations(): Promise<void> {
        const stream = callClaudeStream({
          systemPrompt: buildSystemPrompt(ctx),
          userMessage: buildUserMessage(ctx.request),
          maxTokens: 4000,
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

        const parsed = parseJson<ClaudeVariationsResponse>(accumulated)
        if (!Array.isArray(parsed?.variations)) {
          throw new Error('Claude returned an unexpected response structure. Try again.')
        }

        // Default output is one recommended post. Guard against model drift: if the
        // model returns more than one despite the prompt, keep only the first and
        // warn — never surface extras to the UI.
        if (parsed.variations.length > 1) {
          console.warn(
            `[linkedin/generate] model returned ${parsed.variations.length} variations; keeping only the first (one recommended post).`,
          )
        }
        const recommended = parsed.variations[0]
        if (!recommended?.body) {
          throw new Error('Claude did not return a usable post. Try again.')
        }

        const variations: LinkedInVariation[] = [recommended].map((v) => ({
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
      }

      // Coaching runs in PARALLEL and is best-effort: a failure or timeout must
      // never block or fail the variations the user is waiting on.
      const coachingPromise: Promise<PostCoaching | null> = callClaude({
        systemPrompt: buildCoachingSystemPrompt(),
        userMessage: buildCoachingUserMessage(ctx.request),
        maxTokens: 1500,
      })
        .then((res) => parseJson<PostCoaching>(res.content))
        .catch(() => null)

      try {
        emit({ type: 'progress', label: 'Core thesis identified' })
        try {
          await generateVariations()
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying...' })
            await new Promise(r => setTimeout(r, 3000))
            await generateVariations()
          } else {
            throw err
          }
        }

        // Emit coaching once it's ready (it usually finished during variations).
        // Bounded so a slow coaching call can't hold the stream open.
        const coaching = await Promise.race([
          coachingPromise,
          new Promise<null>((r) => setTimeout(() => r(null), 20000)),
        ])
        if (coaching?.readerPsychology) emit({ type: 'coaching', data: coaching })
      } catch (err) {
        emit({ type: 'error', message: friendlyError(err) })
      } finally {
        controller.close()
      }
    },
  })
}

// On-demand alternate angles: streamed like the anchor but seeded with the
// already-shown post so the two results are genuinely distinct. No coaching —
// this is a secondary action and must never sit on the anchor's critical path.
export function runLinkedInAlternates(
  ctx: LinkedInPromptContext,
  anchorBody: string,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      async function generateAlternates(): Promise<void> {
        const stream = callClaudeStream({
          systemPrompt: buildAlternatesSystemPrompt(ctx),
          userMessage: buildAlternatesUserMessage(ctx.request, anchorBody),
          maxTokens: 4000,
        })

        let accumulated = ''
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
          }
        }

        const parsed = parseJson<ClaudeVariationsResponse>(accumulated)
        if (!Array.isArray(parsed?.variations)) {
          throw new Error('Claude returned an unexpected response structure. Try again.')
        }

        // Cap at two alternates; drop any without a body.
        const variations: LinkedInVariation[] = parsed.variations
          .filter((v) => v?.body)
          .slice(0, 2)
          .map((v) => ({
            id: crypto.randomUUID(),
            label: v.label || 'Alternate angle',
            campaignName: v.campaignName ?? v.label,
            body: v.body,
            hooks: v.hooks ?? [],
            hashtags: normalizeHashtags(v.hashtags),
            mentions: [],
            ctaSuggestions: v.ctaSuggestions ?? [],
            transformationDelta: v.transformationDelta ?? { changes: [] },
          }))

        if (variations.length === 0) {
          throw new Error('No alternate angles were produced. Try again.')
        }

        emit({ type: 'complete', data: { variations } as LinkedInGenerationResult })
      }

      try {
        emit({ type: 'progress', label: 'Exploring alternate angles...' })
        try {
          await generateAlternates()
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying...' })
            await new Promise(r => setTimeout(r, 3000))
            await generateAlternates()
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
