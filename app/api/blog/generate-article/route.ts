import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { runPhase4to10 } from '@/lib/blog/runPhase4to10'
import type { BlogGenerationRequest, NarrativeStrategy, HookExploration } from '@/lib/blog/types'
import type { BlogPromptContext } from '@/lib/blog/buildBlogPrompt'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { request, narrativeStrategy, hookExploration, selectedHeadline } = body as {
    request: BlogGenerationRequest
    narrativeStrategy: NarrativeStrategy
    hookExploration: HookExploration
    selectedHeadline: string
  }

  if (!request?.primaryKeyword || !narrativeStrategy?.coreArgument || !selectedHeadline) {
    return new Response(JSON.stringify({ error: 'request, narrativeStrategy, and selectedHeadline are required' }), { status: 400 })
  }

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (request.lensIds ?? [])
    .map(id => allLenses.find(l => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map(l => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const ctx: BlogPromptContext = { request, lenses: resolvedLenses, selectedHeadline }

  const stream = runPhase4to10({
    ctx,
    narrativeStrategy,
    hookExploration,
    selectedHeadline,
    startedAt: new Date().toISOString(),
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'application/x-ndjson', 'Cache-Control': 'no-cache' },
  })
}
