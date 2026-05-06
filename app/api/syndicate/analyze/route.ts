import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { analyzeUrl } from '@/lib/syndicate/analyzeUrl'
import { analyzeInputSchema } from '@/lib/syndicate/schemas/analyzeSchema'
import type { AnalysisPhase } from '@/lib/syndicate/types/analysis'
import { ANALYSIS_PHASE_LABELS } from '@/lib/syndicate/types/analysis'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = analyzeInputSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_URL', message: parsed.error.issues[0]?.message ?? 'Invalid URL.' } },
      { status: 400 },
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      const onProgress = (phase: AnalysisPhase) => {
        send({ type: 'progress', phase, label: ANALYSIS_PHASE_LABELS[phase] })
      }

      try {
        const result = await analyzeUrl(
          parsed.data.url,
          session.workspaceId,
          session.userId,
          onProgress,
        )
        send({ type: 'result', success: true, data: result })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Analysis failed.'

        let code = 'ANALYSIS_FAILED'
        let userMessage = "We hit a problem running the analysis. Please try again."
        let status = 500

        if (message.startsWith('FETCH_FAILED')) {
          code = 'FETCH_FAILED'
          userMessage = "We couldn't reach that URL. Check that it's publicly accessible."
          status = 422
        } else if (message.startsWith('EXTRACTION_FAILED')) {
          code = 'EXTRACTION_FAILED'
          userMessage = "We couldn't extract readable content — the page may be paywalled or bot-protected."
          status = 422
        }

        send({ type: 'error', success: false, error: { code, message: userMessage }, status })
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
    },
  })
}
