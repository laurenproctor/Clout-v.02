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

function buildSystemPrompt(ctx: ThreadsPromptContext): string {
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

  lines.push(`## Output Format`)
  lines.push(`Respond with ONLY valid JSON matching this exact schema:`)
  lines.push(``)
  lines.push(
    JSON.stringify(
      {
        variations: [
          {
            label: 'Observation',
            campaignName: 'Why Most Teams Mistake Activity for Progress — Observation Angle',
            primaryText:
              'Most productivity systems are just sophisticated ways to feel busy. The hard part is admitting that not all motion is progress.',
            angle: 'personal_observation',
            openingLine: 'Most productivity systems are just sophisticated ways to feel busy.',
            hashtag: null,
          },
          {
            label: 'Contrarian',
            campaignName: 'Why Most Teams Mistake Activity for Progress — Contrarian Angle',
            primaryText:
              'Counterintuitive take: the teams doing the most are often the ones making the least progress. Busyness is a great cover for unclear thinking.',
            angle: 'contrarian_take',
            openingLine: 'Counterintuitive take: the teams doing the most are often the least productive.',
            hashtag: null,
          },
          {
            label: 'Insight',
            campaignName: 'Why Most Teams Mistake Activity for Progress — Insight Angle',
            primaryText:
              'There is a specific moment in a project when you realize the last three weeks were mostly maintenance. It passes quickly. Then you do it again.',
            angle: 'quiet_insight',
            openingLine: 'There is a specific moment in a project when you realize the last three weeks were mostly maintenance.',
            hashtag: null,
          },
          {
            label: 'Question',
            campaignName: 'Why Most Teams Mistake Activity for Progress — Question Angle',
            primaryText:
              'If you removed all the meetings and status updates from your week, how much actual progress would remain? I keep returning to this question.',
            angle: 'open_question',
            openingLine: 'If you removed all the meetings and status updates from your week, how much actual progress would remain?',
            hashtag: null,
          },
        ],
      },
      null,
      2,
    ),
  )

  return lines.join('\n')
}

function buildUserMessage(request: ThreadsGenerationRequest): string {
  const audience =
    request.audience === 'custom' && request.customAudience
      ? request.customAudience
      : request.audience

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

  if (request.sourceUrl) {
    lines.push(
      `## Source URL`,
      ``,
      request.sourceUrl,
      ``,
      `Include the source URL at the end of each variation.`,
      ``,
    )
  }

  lines.push(
    `## Instructions`,
    ``,
    `Generate exactly 4 Threads post variations — one for each angle below:`,
    ``,
    `1. **Observation** (angle: personal_observation) — a first-person personal observation. Specific, grounded, quietly confident. Not a headline — something a person actually noticed.`,
    `2. **Contrarian** (angle: contrarian_take) — challenges a widely-held belief or common practice. Must feel earned, not edgy for shock value.`,
    `3. **Insight** (angle: quiet_insight) — a slow-burn observation that rewards reading. Understated, precise, slightly unexpected.`,
    `4. **Question** (angle: open_question) — an open question that invites reflection or reply. Must not feel rhetorical or baited. End on the question.`,
    ``,
    `Each variation must include:`,
    `- label: one of "Observation", "Contrarian", "Insight", "Question"`,
    `- campaignName: a compelling, specific headline (8–12 words) describing the post — used as the studio title. Format: "[Core insight or hook] — [Variation angle]". Do not use generic labels.`,
    `- primaryText: the full post text. Hard max 500 characters. Correct grammar, complete sentences, proper punctuation throughout.`,
    `- angle: the exact angle enum value shown above (personal_observation, contrarian_take, quiet_insight, open_question)`,
    `- openingLine: the exact first sentence of primaryText`,
    `- hashtag: a single relevant hashtag string (without #) if it genuinely aids discovery, or null if none fits`,
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

        const variations: ThreadsVariation[] = parsed.variations.map((v) => ({
          id: crypto.randomUUID(),
          label: v.label,
          campaignName: v.campaignName ?? v.label,
          primaryText: v.primaryText,
          angle: v.angle as ThreadsVariation['angle'],
          openingLine: v.openingLine,
          hashtag: v.hashtag,
        }))

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
