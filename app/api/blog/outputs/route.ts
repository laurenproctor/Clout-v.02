import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { resolveCampaignStamp } from '@/lib/campaigns/saveStamp'
import { z } from 'zod'

const bodySchema = z.object({
  title: z.string().min(1),
  wordCount: z.number().int().positive(),
  markdown: z.string().min(1),
  campaignId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const { title, wordCount, markdown, campaignId } = parsed.data

  // Stamp campaign_id (+ default goal) when this article was created for a
  // campaign. Validates the campaign belongs to this workspace.
  const stamp = await resolveCampaignStamp({ campaignId, workspaceId: session.workspaceId })
  if (!stamp.ok) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      status: 'draft',
      content_type: 'blog',
      title,
      content: { markdown, wordCount },
      ...stamp.fields,
      created_at: now,
      updated_at: now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
