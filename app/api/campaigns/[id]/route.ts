import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { getCampaign, updateCampaign } from '@/lib/domain/campaign'
import { GOAL_VALUES } from '@/lib/content/goals'

const updateCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required').optional(),
  goal: z.enum(GOAL_VALUES).optional(),
  purpose: z
    .string()
    .trim()
    .min(20, 'Describe what this campaign is meant to accomplish')
    .optional(),
  status: z.enum(['active', 'paused', 'archived']).optional(),
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await getCampaign(id, session.workspaceId)
  if (!result.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(result.data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the campaign exists in this workspace before updating.
  const existing = await getCampaign(id, session.workspaceId)
  if (!existing.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = updateCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const result = await updateCampaign({
    id,
    workspaceId: session.workspaceId,
    updates: parsed.data,
  })

  if (!result.ok) {
    const status = result.code?.startsWith('INVALID_') ? 400 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(result.data)
}
