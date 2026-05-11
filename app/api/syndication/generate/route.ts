import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getSession } from '@/lib/auth/session'
import { syndicationRequestSchema } from '@/lib/syndication/schemas/syndicationSchema'
import { extractInput } from '@/lib/syndication/extract/extractInput'
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

  const { input, platforms } = parsed.data
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        send({ type: 'progress', phase: 'extracting' })
        const extracted = await extractInput(input)

        send({ type: 'progress', phase: 'analyzing' })
        const intelligence = await extractIntelligence(extracted)
        send({ type: 'intelligence', data: intelligence })

        send({ type: 'progress', phase: 'generating' })

        await Promise.allSettled(
          platforms.map(async (platform: Platform) => {
            try {
              const output = await generateOutput(platform, intelligence, extracted.url || undefined)
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

        if (message.startsWith('FETCH_FAILED')) {
          code = 'FETCH_FAILED'
          userMessage = "We couldn't fetch that URL — it may be paywalled or bot-protected (NYT, WSJ, etc.). Paste the article text directly instead."
        } else if (message.startsWith('EXTRACTION_FAILED')) {
          code = 'EXTRACTION_FAILED'
          userMessage = "We couldn't extract readable content — the page may be paywalled or bot-protected."
        } else if (message.startsWith('LOW_SIGNAL')) {
          code = 'LOW_SIGNAL'
          userMessage = 'Not enough content extracted — the page may be paywalled. Paste the article text directly instead.'
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
