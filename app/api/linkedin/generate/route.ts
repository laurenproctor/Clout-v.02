import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { runLinkedInGeneration } from '@/lib/linkedin/runGeneration'
import type { LinkedInGenerationRequest } from '@/lib/linkedin/types'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const request = body.request as LinkedInGenerationRequest

  // Validate minimum required fields
  if (!request?.postType || !request?.sourceContent || !request?.intent || !request?.audience) {
    return new Response(
      JSON.stringify({ error: 'postType, sourceContent, intent, and audience are required' }),
      { status: 400 }
    )
  }

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map((id) => allLenses.find((l) => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map((l) => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const ctx = { request, lenses: resolvedLenses }
  const stream = runLinkedInGeneration(ctx)

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
