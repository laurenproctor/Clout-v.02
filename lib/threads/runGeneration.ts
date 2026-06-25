// lib/threads/runGeneration.ts
import { callClaudeStream, campaignPromptLines } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import { THREADS_PLATFORM_MODEL } from '@/lib/syndication/platforms/threads'
import type { BrandContext } from '@/lib/brand/getBrandContext'
import type {
  ThreadsGenerationRequest,
  ThreadsVariation,
} from '@/lib/threads/types'

export interface ThreadsPromptContext {
  request: ThreadsGenerationRequest
  lenses: Array<{ id: string; name: string; systemPrompt: string }>
  brandContext: BrandContext
  campaignContext?: { goal: string; purpose: string | null } | null
}

interface ClaudeVariation {
  label: string
  campaignName: string
  primaryText: string
  angle: string
  openingLine: string
  hashtag: string | null
}

interface ClaudeResponse {
  variations: ClaudeVariation[]
}

function mapClaudeVariation(v: ClaudeVariation): ThreadsVariation {
  return {
    id: crypto.randomUUID(),
    label: v.label || 'Recommended',
    campaignName: v.campaignName ?? v.label,
    primaryText: v.primaryText,
    angle: v.angle as ThreadsVariation['angle'],
    openingLine: v.openingLine,
    hashtag: v.hashtag,
  }
}

// Shared platform-model + brand + lenses + campaign prefix. Both the anchor (one
// recommended post) and the alternates (other angles) prompts build on this; only
// the trailing output-format schema differs.
function buildPromptPrefix(ctx: ThreadsPromptContext): string[] {
  const m = THREADS_PLATFORM_MODEL
  const lines: string[] = [
    `# Threads Post Generation`,
    ``,
    m.rhetoricalEnvironment,
    ``,
    `## Pre-Writing Framework`,
    m.preWritingFramework ?? '',
    ``,
    `## Structural Rules`,
    m.structuralRules.map((r) => `- ${r}`).join('\n'),
    ``,
    `## Length`,
    m.lengthTarget,
    ``,
    `## Anti-Patterns — These Disqualify the Post`,
    m.antiPatterns.map((a) => `- ${a}`).join('\n'),
    ``,
    `## Hashtag Rule`,
    m.hashtagRule ?? '',
    ``,
  ]

  lines.push(...buildBrandVoicePromptBlock(ctx.brandContext))

  if (ctx.lenses.length > 0) {
    lines.push(`## Editorial Lenses`)
    for (const lens of ctx.lenses) {
      lines.push(`### ${lens.name}`)
      lines.push(lens.systemPrompt)
      lines.push(``)
    }
  }

  const campaignLines = campaignPromptLines(ctx.campaignContext)
  if (campaignLines.length > 0) {
    lines.push(...campaignLines, ``)
  }

  return lines
}

// One example post object for the output schema, parameterised by label/angle.
function schemaExample(label: string, angle: string, primaryText: string, openingLine: string) {
  return { label, campaignName: `Why Most Teams Mistake Activity for Progress — ${label} Angle`, primaryText, angle, openingLine, hashtag: null }
}

function buildSystemPrompt(ctx: ThreadsPromptContext): string {
  const lines = buildPromptPrefix(ctx)
  lines.push(`## Output Format`)
  lines.push(`Respond with ONLY valid JSON matching this exact schema (a single recommended post in a one-element array):`)
  lines.push(``)
  lines.push(
    JSON.stringify({
      variations: [
        schemaExample(
          'Recommended',
          'personal_observation',
          'Most productivity systems are just sophisticated ways to feel busy. The hard part is admitting that not all motion is progress.',
          'Most productivity systems are just sophisticated ways to feel busy.',
        ),
      ],
    }, null, 2),
  )
  return lines.join('\n')
}

// Alternates: given the already-shown anchor, produce two genuinely different angles.
function buildAlternatesSystemPrompt(ctx: ThreadsPromptContext): string {
  const lines = buildPromptPrefix(ctx)
  lines.push(`## Output Format`)
  lines.push(`Respond with ONLY valid JSON matching this exact schema (exactly two alternate posts):`)
  lines.push(``)
  lines.push(
    JSON.stringify({
      variations: [
        schemaExample(
          'Alternate angle',
          'contrarian_take',
          'Counterintuitive take: the teams doing the most are often the ones making the least progress. Busyness is a great cover for unclear thinking.',
          'Counterintuitive take: the teams doing the most are often the least productive.',
        ),
        schemaExample(
          'Alternate angle',
          'open_question',
          'If you removed all the meetings and status updates from your week, how much actual progress would remain? I keep returning to this question.',
          'If you removed all the meetings and status updates from your week, how much actual progress would remain?',
        ),
      ],
    }, null, 2),
  )
  return lines.join('\n')
}

const ANGLE_DESCRIPTIONS: Record<ThreadsGenerationRequest['narrativeStyle'] & string, string> = {
  personal_observation: 'a first-person observation. Specific, grounded, quietly confident.',
  contrarian_take: 'challenges a widely-held belief. Earned, not edgy for shock value.',
  quiet_insight: 'a slow-burn observation that rewards reading. Understated, precise.',
  open_question: 'an open question that invites genuine reflection. End on the question.',
}

// Post-type framing. 'single' keeps the default behavior; image/video write a
// caption that complements a visual without pretending the media exists; link
// builds copy around the source URL without fabricating a preview card.
function postTypeDirective(request: ThreadsGenerationRequest): string[] {
  switch (request.postType) {
    case 'image':
    case 'video':
      return [
        `This post accompanies a ${request.postType}. Write a caption-style post that complements a visual the reader will see alongside it.`,
        `Do not describe the ${request.postType} as if you can see it, and do not narrate "in this image/video".`,
      ]
    case 'link':
      return [
        `This is a link post. Write copy that frames the linked source and earns the click.`,
        `Surface the URL naturally inline or at the end — do not fabricate a link-preview card, title, or description.`,
      ]
    default:
      return []
  }
}

// CTA is treated as intent, not literal copy: gesture toward it softly, never
// append the label verbatim, and respect the platform's high CTA resistance.
function ctaDirective(cta?: string): string[] {
  if (!cta || cta === 'No CTA') {
    return [`Do not include any call to action — let the post end on open tension, not a pitch.`]
  }
  return [
    `Soft CTA intent: "${cta}". Treat this as intent, not literal text — do not append "${cta}" verbatim.`,
    `End with a quiet, Threads-native phrasing that gestures toward this intent. Avoid salesy or direct-response endings; Threads readers resist overt CTAs.`,
  ]
}

function buildUserMessage(request: ThreadsGenerationRequest): string {
  const audience =
    request.audience === 'custom' && request.customAudience
      ? request.customAudience
      : request.audience

  // Link posts carry the destination in linkUrl; route it through the same
  // "source URL" channel the scraper/anchor already understand.
  const effectiveSourceUrl =
    request.sourceUrl ?? (request.postType === 'link' ? request.linkUrl : undefined)

  const lines = [
    `## Post Brief`,
    ``,
    `Audience: ${audience}`,
    ``,
    `## Source Content`,
    ``,
    request.sourceContent,
    ``,
  ]

  if (effectiveSourceUrl) {
    lines.push(
      `## Source URL`,
      ``,
      effectiveSourceUrl,
      ``,
      `Include the source URL in the post.`,
      ``,
    )
  }

  lines.push(
    `## Instructions`,
    ``,
    `Write ONE recommended Threads post — the single strongest version for this brief. Do not produce multiple variations.`,
    ``,
  )

  // Narrative style: honor an explicit selection, otherwise let the model pick.
  const chosenAngle = request.narrativeStyle
  if (chosenAngle) {
    lines.push(
      `Write the post in this angle specifically — ${chosenAngle}: ${ANGLE_DESCRIPTIONS[chosenAngle]}`,
      ``,
    )
  } else {
    lines.push(
      `Choose the angle that will perform best for this source and audience (pick exactly one, whichever is strongest):`,
      ...(Object.entries(ANGLE_DESCRIPTIONS).map(([k, v]) => `- **${k}** — ${v}`)),
      ``,
    )
  }

  const postType = postTypeDirective(request)
  if (postType.length > 0) lines.push(...postType, ``)

  lines.push(...ctaDirective(request.cta), ``)

  lines.push(
    `Return it as a one-element "variations" array. The post must include:`,
    `- label: "Recommended"`,
    `- campaignName: a compelling, specific headline (8–12 words) describing the post — used as the studio title. Do not use generic labels.`,
    `- primaryText: the full post text. Hard max 500 characters. Correct grammar, complete sentences, proper punctuation throughout.`,
    `- angle: the exact angle enum value you chose (personal_observation, contrarian_take, quiet_insight, open_question)`,
    `- openingLine: the exact first sentence of primaryText`,
    `- hashtag: a single relevant hashtag string (without #) if it genuinely aids discovery, or null if none fits`,
  )

  return lines.join('\n')
}

function buildAlternatesUserMessage(request: ThreadsGenerationRequest, anchorBody: string): string {
  return [
    buildUserMessage(request),
    ``,
    `## Already-recommended post (do NOT repeat this angle)`,
    ``,
    anchorBody,
    ``,
    `## Alternate-angles instruction`,
    ``,
    `The post above is the recommended version the user has already seen. Now produce TWO alternate Threads posts that take genuinely different angles from it and from each other.`,
    `Each alternate must stand on its own, follow all rules above, use label "Alternate angle", and include the same fields (campaignName, primaryText ≤500 chars, angle enum, openingLine, hashtag or null).`,
  ].join('\n')
}

function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('overloaded') || msg.includes('529') || msg.includes('overloaded_error')
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (isOverloaded(err)) return 'The AI is currently overloaded. Please try again in a moment.'
  if (msg.includes('timeout') || msg.includes('timed out'))
    return 'Generation timed out — try a shorter source or fewer lenses.'
  if (msg.startsWith('{')) return 'Generation failed. Please try again.'
  return msg
}

export function runThreadsGeneration(ctx: ThreadsPromptContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      async function generate(): Promise<void> {
        const stream = callClaudeStream({
          systemPrompt: buildSystemPrompt(ctx),
          userMessage: buildUserMessage(ctx.request),
          maxTokens: 3000,
        })

        let accumulated = ''
        let chunkCount = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
            chunkCount++
            if (chunkCount === 15) emit({ type: 'progress', label: 'Writing angles...' })
            if (chunkCount === 60) emit({ type: 'progress', label: 'Refining...' })
          }
        }

        const parsed = parseJson<ClaudeResponse>(accumulated)
        if (!Array.isArray(parsed?.variations)) {
          throw new Error('Claude returned an unexpected response structure. Try again.')
        }

        // Default output is one recommended post. Guard against model drift.
        if (parsed.variations.length > 1) {
          console.warn(
            `[threads/generate] model returned ${parsed.variations.length} variations; keeping only the first (one recommended post).`,
          )
        }
        const recommended = parsed.variations[0]
        if (!recommended?.primaryText) {
          throw new Error('Claude did not return a usable post. Try again.')
        }

        const variations: ThreadsVariation[] = [recommended].map(mapClaudeVariation)

        emit({ type: 'complete', data: { variations } })
      }

      try {
        emit({ type: 'progress', label: 'Reading the source...' })
        try {
          await generate()
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying...' })
            await new Promise((r) => setTimeout(r, 3000))
            await generate()
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

// On-demand alternate angles — streamed like the anchor but seeded with the
// already-shown post so the two results are genuinely distinct.
export function runThreadsAlternates(
  ctx: ThreadsPromptContext,
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
          maxTokens: 3000,
        })

        let accumulated = ''
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
          }
        }

        const parsed = parseJson<ClaudeResponse>(accumulated)
        if (!Array.isArray(parsed?.variations)) {
          throw new Error('Claude returned an unexpected response structure. Try again.')
        }

        const variations: ThreadsVariation[] = parsed.variations
          .filter((v) => v?.primaryText)
          .slice(0, 2)
          .map(mapClaudeVariation)

        if (variations.length === 0) {
          throw new Error('No alternate angles were produced. Try again.')
        }

        emit({ type: 'complete', data: { variations } })
      }

      try {
        emit({ type: 'progress', label: 'Exploring alternate angles...' })
        try {
          await generateAlternates()
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying...' })
            await new Promise((r) => setTimeout(r, 3000))
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
