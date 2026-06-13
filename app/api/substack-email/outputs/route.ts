import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Creates a lifecycle-ready Substack Email output. Mirrors /api/note/outputs. The output
// enters Clout's normal lifecycle (Draft → Studio → Ready → Scheduled → Published); the
// StudioSubstackBar + publishing bridge own publishing later. The user-facing product is
// "Substack Email"; the internal content_type stays 'substack-newsletter' (the bridge,
// Studio, scheduler, and calendar all key on it).
const bodySchema = z.object({
  title:     z.string().min(1),
  subtitle:  z.string().optional(),
  markdown:  z.string().min(1),
  wordCount: z.number().int().optional(),
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

  const { title, subtitle, markdown, wordCount } = parsed.data
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      status:       'draft',
      content_type: 'substack-newsletter',  // internal token — never shown to the user
      title:        title,
      content: {
        body:      markdown,                 // markdown is the editable body (NOT canonical JSON)
        subtitle:  subtitle ?? null,
        wordCount: wordCount ?? null,
      },
      channel_id:   null,
      created_at:   now,
      updated_at:   now,
    })
    .select('id, status, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
