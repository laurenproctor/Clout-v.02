import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60
import { getSession } from '@/lib/auth/session'
import { syndicationRequestSchema } from '@/lib/syndication/schemas/syndicationSchema'
import { extractInput } from '@/lib/syndication/extract/extractInput'
import { extractIntelligence } from '@/lib/syndication/intelligence/extractIntelligence'
import { generateOutput } from '@/lib/syndication/generation/generateOutput'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'
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

  const { input, platforms, lenses: lensIds } = parsed.data
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      try {
        const resolvedLenses: SyndicationLens[] = []
        if (lensIds.length > 0) {
          const workspaceLensesResult = await listLenses({ workspaceId: session.workspaceId })
          const workspaceLenses = workspaceLensesResult.ok ? workspaceLensesResult.data : []

          for (const id of lensIds) {
            const preset = PRESET_LENSES.find((l) => l.name === id)
            if (preset) {
              resolvedLenses.push({
                id: preset.name,
                name: preset.name,
                rhetoricalModifier: preset.rhetoricalModifier,
                isPreset: true,
              })
              continue
            }
            const workspaceLens = workspaceLenses.find((l) => l.id === id)
            if (workspaceLens) {
              resolvedLenses.push({
                id: workspaceLens.id,
                name: workspaceLens.name,
                rhetoricalModifier: workspaceLens.systemPrompt,
                isPreset: false,
              })
            }
          }
        }

        send({ type: 'progress', phase: 'extracting' })
        const extracted = await extractInput(input)

        send({ type: 'progress', phase: 'analyzing' })
        const intelligence = await extractIntelligence(extracted)
        send({ type: 'intelligence', data: intelligence })

        send({ type: 'progress', phase: 'generating' })

        await Promise.allSettled(
          platforms.map(async (platform: Platform) => {
            try {
              const output = await generateOutput(platform, intelligence, resolvedLenses)
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
