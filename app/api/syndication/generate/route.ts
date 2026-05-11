import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getSession } from '@/lib/auth/session'
import { syndicationRequestSchema } from '@/lib/syndication/schemas/syndicationSchema'
import { extractInput, extractRawText } from '@/lib/syndication/extract/extractInput'
import { extractIntelligence } from '@/lib/syndication/intelligence/extractIntelligence'
import { generateOutput } from '@/lib/syndication/generation/generateOutput'
import type { Platform } from '@/lib/syndication/types/intelligence'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = syndicationRequestSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { input, platforms, notes } = parsed.data
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        send({ type: 'progress', phase: 'extracting' })

        let extracted
        let notesForGeneration: string | undefined = notes
        try {
          extracted = await extractInput(input)
        } catch (urlErr) {
          const notesText = notes?.trim() ?? ''
          const wordCount = notesText.split(/\s+/).filter(Boolean).length
          if (wordCount >= 50) {
            extracted = extractRawText(notesText)
            notesForGeneration = undefined
          } else {
            throw urlErr
          }
        }

        send({ type: 'progress', phase: 'analyzing' })
        const intelligence = await extractIntelligence(extracted)
        send({ type: 'intelligence', data: intelligence })

        send({ type: 'progress', phase: 'generating' })

        await Promise.allSettled(
          platforms.map(async (platform: Platform) => {
            try {
              const output = await generateOutput(platform, intelligence, extracted.url || undefined, notesForGeneration)
              send({ type: 'output', platform, content: output.content })
            } catch (err) {
              send({
                type: 'platform_error',
                platform,
                message: err instanceof Error ? err.message : 'Generation failed',
              })
            }
          }),
        )

        send({ type: 'complete' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation failed.'

        let code = 'GENERATION_FAILED'
        let userMessage = "Something went wrong. Please try again."

        if (message.startsWith('FETCH_FAILED') || message.startsWith('FETCH_BLOCKED') || message.startsWith('EXTRACTION_FAILED') || message.startsWith('LOW_SIGNAL') || message.startsWith('JINA_FAILED')) {
          code = 'FETCH_FAILED'
          userMessage = "Could not retrieve article content. Paste the article text in the box below the URL field to continue."
        } else if (message.startsWith('FETCH_TIMEOUT') || message.startsWith('JINA_TIMEOUT')) {
          code = 'FETCH_TIMEOUT'
          userMessage = "That URL took too long to respond. Try again, or paste the article text in the box below."
        }

        console.error('[syndication/generate] error:', message)
        send({ type: 'error', error: { code, message: userMessage, _debug: message } })
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
