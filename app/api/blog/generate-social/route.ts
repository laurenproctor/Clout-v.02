import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { generateDistribution } from '@/lib/blog/generateDistribution'
import type { GeneratedBlogPackage } from '@/lib/blog/types'
import type { BlogPromptContext } from '@/lib/blog/buildBlogPrompt'

export const maxDuration = 120

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const { blogPackage } = body as { blogPackage: GeneratedBlogPackage }

  if (!blogPackage?.article?.markdown || !blogPackage?.selectedHeadline) {
    return new Response(JSON.stringify({ error: 'blogPackage with article and selectedHeadline is required' }), { status: 400 })
  }

  const lensesResult = await listLenses({ workspaceId: session.workspaceId })
  const allLenses = lensesResult.ok ? lensesResult.data : []
  const resolvedLenses = (blogPackage.request.lensIds ?? [])
    .map(id => allLenses.find(l => l.id === id))
    .filter((l): l is NonNullable<typeof l> => l !== undefined)
    .map(l => ({ id: l.id, name: l.name, systemPrompt: l.systemPrompt }))

  const ctx: BlogPromptContext = {
    request: blogPackage.request,
    lenses: resolvedLenses,
    selectedHeadline: blogPackage.selectedHeadline,
  }

  const dist = await generateDistribution(
    ctx,
    blogPackage.narrativeStrategy,
    blogPackage.article.markdown,
    blogPackage.selectedHeadline
  )

  return new Response(
    JSON.stringify({ distribution: { linkedin: dist.linkedin, xThread: dist.xThread, newsletter: dist.newsletter } }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
