import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CONTENT_TYPE_MAP = {
  linkedin: 'linkedin',
  xThread: 'twitter',
  newsletter: 'newsletter',
} as const

const bodySchema = z.object({
  content: z.string().min(1),
  channel: z.enum(['linkedin', 'xThread', 'newsletter']),
  title: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const { content, channel, title } = parsed.data
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      status: 'draft',
      content_type: CONTENT_TYPE_MAP[channel],
      title: title ?? null,
      content: { body: content },
      created_at: now,
      updated_at: now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
