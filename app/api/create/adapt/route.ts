import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { getBrandContext } from '@/lib/brand/getBrandContext'
import { getCampaignContext } from '@/lib/domain/campaign'
import { adaptAnchorToPlatform } from '@/lib/create/adapt'
import type { AdaptTargetPlatform } from '@/lib/create/types'

export const maxDuration = 60

const TARGETS: AdaptTargetPlatform[] = ['threads', 'x']

// Adapt an approved LinkedIn anchor into a native Threads or X draft. Brand and
// campaign context are resolved SERVER-SIDE from the session — never trusted
// from the client. Returns one adapted draft (not persisted; the client decides
// whether to Save/Schedule it).
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { anchorBody, anchorHashtags, targetPlatform, campaignId } = (body ?? {}) as {
    anchorBody?: unknown
    anchorHashtags?: unknown
    targetPlatform?: unknown
    campaignId?: string
  }

  if (typeof anchorBody !== 'string' || !anchorBody.trim()) {
    return NextResponse.json({ error: 'anchorBody is required' }, { status: 400 })
  }
  if (typeof targetPlatform !== 'string' || !TARGETS.includes(targetPlatform as AdaptTargetPlatform)) {
    return NextResponse.json({ error: 'targetPlatform must be one of: threads, x' }, { status: 400 })
  }
  const hashtags = Array.isArray(anchorHashtags)
    ? anchorHashtags.filter((t): t is string => typeof t === 'string')
    : []

  const brandContext = await getBrandContext()

  let campaignContext: { goal: string; purpose: string } | null = null
  if (campaignId) {
    campaignContext = await getCampaignContext(campaignId, session.workspaceId)
    if (!campaignContext) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }
  }

  try {
    const result = await adaptAnchorToPlatform({
      anchorBody,
      anchorHashtags: hashtags,
      targetPlatform: targetPlatform as AdaptTargetPlatform,
      brandContext,
      campaignContext,
    })
    return NextResponse.json({ platform: targetPlatform, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Adaptation failed'
    console.warn('[create/adapt] failed:', msg)
    return NextResponse.json({ error: 'Adaptation failed. Please try again.' }, { status: 502 })
  }
}
