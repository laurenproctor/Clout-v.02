import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { runPhase1to3 } from '@/lib/blog/runPhase1to3'
import type { BlogGenerationRequest } from '@/lib/blog/types'
import type { BlogPromptContext } from '@/lib/blog/buildBlogPrompt'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const request = body.request as BlogGenerationRequest

  if (!request?.primaryKeyword) {
    return new Response(JSON.stringify({ error: 'primaryKeyword is required' }), { status: 400 })
  }

  const [lensesResult, brandContext] = await Promise.all([
    listLenses({ workspaceId: session.workspaceId }),
    getBrandContext(),
  ])
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map(id => allLenses.find(l => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map(l => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const ctx: BlogPromptContext = { request, lenses: resolvedLenses, brandContext }

  const stream = runPhase1to3(ctx)
  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
