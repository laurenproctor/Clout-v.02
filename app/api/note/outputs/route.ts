import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { resolveCampaignStamp } from '@/lib/campaigns/saveStamp'
import { z } from 'zod'

const bodySchema = z.object({
  variation: z.object({
    body:      z.string().min(1),
    register:  z.enum(['observation', 'insight', 'provocation', 'story']),
    wordCount: z.number().int().optional(),
  }),
  title:      z.string().optional(),
  campaignId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
      { status: 400 }
    )
  }

  const { variation, title, campaignId } = parsed.data

  // Stamp campaign_id (+ default goal) when this note was created for a campaign.
  // Validates the campaign belongs to this workspace.
  const stamp = await resolveCampaignStamp({ campaignId, workspaceId: session.workspaceId })
  if (!stamp.ok) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      status:       'draft',
      content_type: 'substack-note',
      title:        title ?? null,
      content: {
        body:      variation.body,
        register:  variation.register,
        wordCount: variation.wordCount ?? null,
      },
      channel_id: null,
      ...stamp.fields,
      created_at: now,
      updated_at: now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
