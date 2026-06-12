import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { createCampaign, listCampaigns } from '@/lib/domain/campaign'
import { GOAL_VALUES } from '@/lib/content/goals'
import type { CampaignStatus } from '@/types/domain'

const createCampaignSchema = z.object({
  name: z.string().trim().min(1, 'Campaign name is required'),
  goal: z.enum(GOAL_VALUES, { message: 'Choose a strategic goal' }),
  purpose: z.string().trim().min(20, 'Describe what this campaign is meant to accomplish'),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') as CampaignStatus | null

  const result = await listCampaigns({
    workspaceId: session.workspaceId,
    ...(status && { status }),
  })
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })
  return NextResponse.json(result.data)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = createCampaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const result = await createCampaign({
    workspaceId: session.workspaceId,
    createdBy: session.userId,
    name: parsed.data.name,
    goal: parsed.data.goal,
    purpose: parsed.data.purpose,
  })

  if (!result.ok) {
    const status = result.code?.startsWith('INVALID_') ? 400 : 500
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json(result.data, { status: 201 })
}
