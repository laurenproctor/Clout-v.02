import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getOnboardingGeneration } from '@/lib/domain/onboarding'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getOnboardingGeneration({ workspaceId: session.workspaceId })
  if (!result.ok) return NextResponse.json(null)
  if (!result.data || result.data.status !== 'complete') return NextResponse.json(null)

  return NextResponse.json({
    positioning: result.data.positioning,
    post_ideas: result.data.postIdeas,
    draft_post: result.data.draftPost,
  })
}
