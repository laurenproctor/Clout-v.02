import { callClaudeStream } from '@/lib/ai/generate'
import { parseJson } from '@/lib/blog/parseJson'
import { SUBSTACK_NOTE_PLATFORM_MODEL } from '@/lib/syndication/platforms/substack'
import type { NoteGenerationRequest, NoteVariation, NoteRegister } from './types'

export interface NotePromptContext {
  request: NoteGenerationRequest
  lenses:  Array<{ id: string; name: string; systemPrompt: string }>
}

interface ClaudeNoteResponse {
  variations: Array<{ register: NoteRegister; body: string }>
}

function buildSystemPrompt(ctx: NotePromptContext): string {
  const m = SUBSTACK_NOTE_PLATFORM_MODEL
  const lines: string[] = [
    '# Note Generation — Editorial Standards',
    '',
    '## Platform context',
    m.rhetoricalEnvironment,
    '',
    '## Structure rules',
    ...m.structuralRules.map(r => `- ${r}`),
    '',
    '## Anti-patterns to avoid',
    ...m.antiPatterns.map(a => `- ${a}`),
    '',
    '## Register definitions',
    '- **observation**: names a specific pattern you have noticed in the world or your field',
    '- **insight**: draws a counterintuitive conclusion from evidence',
    '- **provocation**: challenges a widely-held assumption without being contrarian for its own sake',
    '- **story**: opens with a small personal moment and closes with a broader insight',
  ]

  if (ctx.lenses.length > 0) {
    lines.push('', '## Editorial Lenses')
    for (const lens of ctx.lenses) {
      lines.push(`### ${lens.name}`, lens.systemPrompt, '')
    }
  }

  lines.push(
    '',
    '## Output format',
    'Respond with ONLY valid JSON — no markdown wrapper, no explanation:',
    '',
    JSON.stringify({
      variations: [
        { register: 'observation', body: '50–200 words of prose' },
        { register: 'insight',     body: '50–200 words of prose' },
        { register: 'provocation', body: '50–200 words of prose' },
        { register: 'story',       body: '50–200 words of prose' },
      ],
    }, null, 2),
    '',
    'Rules:',
    '- Each variation is independent — do not reference the others',
    '- No bullets, headers, or lists in any variation',
    '- No CTA, subscribe prompt, or self-promotion',
    '- Each must feel complete on its own',
  )

  return lines.join('\n')
}

function buildUserMessage(req: NoteGenerationRequest): string {
  const lines: string[] = ['## Note Brief', '']
  if (req.audience) lines.push(`**Audience:** ${req.audience}`, '')
  if (req.sourceUrl) lines.push(`**Source URL:** ${req.sourceUrl}`, '')
  lines.push(
    '## Source Content',
    '',
    req.sourceContent,
    '',
    '## Instructions',
    '',
    'Generate four distinct note variations from the source content — one per register.',
    'Each should feel like a writer genuinely thinking in public, not summarizing.',
  )
  return lines.join('\n')
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
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

export function runNoteGeneration(ctx: NotePromptContext): ReadableStream<Uint8Array> {
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
          maxTokens:    1000,
        })

        let accumulated = ''
        let chunkCount  = 0

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            accumulated += event.delta.text
            chunkCount++
            if (chunkCount === 15) emit({ type: 'progress', label: 'Finding the angle…' })
            if (chunkCount === 50) emit({ type: 'progress', label: 'Writing variations…' })
          }
        }

        const parsed = parseJson<ClaudeNoteResponse>(accumulated)
        if (!parsed?.variations?.length) {
          throw new Error('Claude returned an unexpected response. Try again.')
        }

        const variations: NoteVariation[] = parsed.variations.map(v => ({
          id:        crypto.randomUUID(),
          register:  v.register,
          body:      v.body,
          wordCount: countWords(v.body),
        }))

        emit({ type: 'complete', data: { variations } })
      }

      try {
        emit({ type: 'progress', label: 'Reading source…' })
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
