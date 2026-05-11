import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bodySchema = z.object({
  platform: z.enum(['x', 'linkedin', 'substack', 'blog', 'threads', 'facebook']),
  content: z.string().min(1).max(100_000),
  channelId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request.' },
      { status: 400 },
    )
  }

  const { platform, content, channelId } = parsed.data
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      generation_id: null,
      status: 'draft',
      content_type: 'syndication',
      content: { body: content, platform },
      channel_id: channelId ?? null,
      created_at: now,
      updated_at: now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
