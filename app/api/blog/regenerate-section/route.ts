import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { callClaude } from '@/lib/ai/generate'
import { buildBlogSystemPrompt } from '@/lib/blog/buildBlogPrompt'
import type { BlogGenerationRequest, NarrativeStrategy, OutlineSection } from '@/lib/blog/types'
import type { BlogPromptContext } from '@/lib/blog/buildBlogPrompt'

export const maxDuration = 300

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    request,
    narrativeStrategy,
    sectionIndex,
    outline,
    articleMarkdown,
    selectedHeadline,
  } = body as {
    request: BlogGenerationRequest
    narrativeStrategy: NarrativeStrategy
    sectionIndex: number
    outline: OutlineSection[]
    articleMarkdown: string
    selectedHeadline: string
  }

  if (!request?.primaryKeyword || !narrativeStrategy || sectionIndex === undefined || !outline) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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

  const ctx: BlogPromptContext = { request, lenses: resolvedLenses, brandContext, selectedHeadline }
  const system = buildBlogSystemPrompt(ctx)
  const section = outline[sectionIndex]

  if (!section) {
    return NextResponse.json({ error: 'Invalid sectionIndex' }, { status: 400 })
  }

  const existingContent = articleMarkdown.slice(0, 2000)

  const user = `Regenerate section ${sectionIndex + 1} of this article with a fresh approach.

Article Headline: ${selectedHeadline}
Core Argument: ${narrativeStrategy.coreArgument}

Section to regenerate:
Heading: ${section.heading} (${section.level})
Purpose: ${section.purpose}
Key Points: ${section.keyPoints.join('; ')}
Target Words: ~${section.estimatedWords}

Existing article context (do not repeat, maintain consistency):
${existingContent}

Write ONLY the section content in markdown. Start with the heading. No JSON wrapper. Take a fresh angle.`

  const res = await callClaude({ systemPrompt: system, userMessage: user, maxTokens: Math.max(1000, section.estimatedWords * 2) })

  return NextResponse.json({ markdown: res.content })
}
