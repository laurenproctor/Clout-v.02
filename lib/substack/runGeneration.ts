import { callClaudeStream } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { buildBrandVoicePromptBlock } from '@/lib/brand/buildBrandVoicePromptBlock'
import { markdownToCanonicalBody } from '@/lib/publishing/canonical/from-blog'
import { generateSlug, generateExcerpt } from '@/lib/publishing/canonical/normalizer'
import { SUBSTACK_PLATFORM_MODEL, SUBSTACK_LENGTH_TARGETS, SUBSTACK_ARTICLE_TYPES } from '@/lib/syndication/platforms/substack'
import type { BrandContext } from '@/lib/brand/getBrandContext'
import type { SubstackGenerationRequest, SubstackGeneratedArticle } from './types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'

export interface SubstackPromptContext {
  request: SubstackGenerationRequest
  lenses:  Array<{ id: string; name: string; systemPrompt: string }>
  brandContext?: BrandContext
}

interface ClaudeArticleResponse {
  title:     string
  subtitle?: string
  body:      string
}

function buildSystemPrompt(ctx: SubstackPromptContext): string {
  const model = SUBSTACK_PLATFORM_MODEL
  const lines: string[] = [
    '# Substack Article Generation — Editorial Standards',
    '',
    `## Platform context`,
    model.rhetoricalEnvironment,
    '',
    '## Structure rules',
    ...model.structuralRules.map(r => `- ${r}`),
    '',
    '## Anti-patterns to avoid',
    ...model.antiPatterns.map(a => `- ${a}`),
  ]

  if (ctx.lenses.length > 0) {
    lines.push('', '## Editorial Lenses')
    for (const lens of ctx.lenses) {
      lines.push(`### ${lens.name}`, lens.systemPrompt, '')
    }
  }

  const brandVoice = buildBrandVoicePromptBlock(ctx.brandContext)
  if (brandVoice.length > 0) lines.push('', ...brandVoice)

  lines.push(
    '',
    '## Output format',
    'Respond with ONLY valid JSON matching this schema (no markdown wrapper):',
    '',
    JSON.stringify({
      title:    'The article title',
      subtitle: 'Optional subtitle / deck line (omit if not needed)',
      body:     'Full article body in Markdown. Use ## for section headings, > for blockquotes.',
    }, null, 2),
    '',
    'Rules:',
    '- title: sharp and specific — the central claim or observation',
    '- subtitle: optional deck line for Substack\'s subtitle field',
    '- body: full prose in Markdown — no truncation, no placeholder text',
    '- Do not wrap in a code block. Output the raw JSON object only.',
  )

  return lines.join('\n')
}

function buildUserMessage(request: SubstackGenerationRequest): string {
  const lengthTarget = request.length
    ? SUBSTACK_LENGTH_TARGETS[request.length].words
    : SUBSTACK_PLATFORM_MODEL.lengthTarget
  const articleTypeDesc = request.articleType
    ? SUBSTACK_ARTICLE_TYPES[request.articleType]
    : null

  const lines: string[] = [
    '## Article Brief',
    '',
    `**Target length:** ${lengthTarget}`,
  ]

  if (articleTypeDesc) {
    lines.push(`**Article type:** ${articleTypeDesc.label} — ${articleTypeDesc.description}`)
  }

  if (request.sourceUrl) {
    lines.push('', `**Source URL:** ${request.sourceUrl}`)
  }

  lines.push(
    '',
    '## Source Content',
    '',
    request.sourceContent,
    '',
    '## Instructions',
    '',
    'Write a Substack article from the source content above.',
    'Adapt the ideas for a subscription newsletter audience — immersive, developed, opinionated.',
    'Follow the editorial standards and anti-patterns defined in the system prompt.',
  )

  return lines.join('\n')
}

function countWords(markdown: string): number {
  return markdown.trim().split(/\s+/).filter(Boolean).length
}

function isOverloaded(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return msg.includes('overloaded') || msg.includes('529')
}

function friendlyError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (isOverloaded(err)) return 'The AI is currently overloaded. Please try again in a moment.'
  if (msg.includes('timeout') || msg.includes('timed out')) return 'Generation timed out — try a shorter source.'
  if (msg.startsWith('{')) return 'Generation failed. Please try again.'
  return msg
}

export function runSubstackGeneration(ctx: SubstackPromptContext): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()

  return new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'))
      }

      async function generate(attempt: number): Promise<void> {
        void attempt
        const stream = callClaudeStream({
          systemPrompt: buildSystemPrompt(ctx),
          userMessage:  buildUserMessage(ctx.request),
          maxTokens:    4000,
        })

        let accumulated = ''
        let chunkCount  = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
            chunkCount++
            if (chunkCount === 20)  emit({ type: 'progress', label: 'Writing article…' })
            if (chunkCount === 100) emit({ type: 'progress', label: 'Developing argument…' })
          }
        }

        const parsed = parseJson<ClaudeArticleResponse>(accumulated)
        if (!parsed?.title || !parsed?.body) {
          throw new Error('Claude returned an unexpected response. Try again.')
        }

        const body     = markdownToCanonicalBody(parsed.body)
        const wordCount = countWords(parsed.body)
        const article: CanonicalArticle = {
          id:      crypto.randomUUID(),
          title:   parsed.title,
          slug:    generateSlug(parsed.title),
          excerpt: generateExcerpt(parsed.body),
          dek:     parsed.subtitle,
          body,
        }

        const result: SubstackGeneratedArticle = {
          title:     parsed.title,
          subtitle:  parsed.subtitle,
          article,
          markdown:  parsed.body,
          wordCount,
        }

        emit({ type: 'complete', data: result })
      }

      try {
        emit({ type: 'progress', label: 'Analyzing source…' })
        try {
          await generate(1)
        } catch (err) {
          if (isOverloaded(err)) {
            emit({ type: 'progress', label: 'API busy — retrying…' })
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
