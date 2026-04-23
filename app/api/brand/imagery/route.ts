import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/db'

type ImageryUpdate = Database['public']['Tables']['brand_imagery_profiles']['Update']

const ALLOWED_FIELDS: (keyof ImageryUpdate)[] = [
  'visual_styles', 'imagery_type', 'composition',
  'overlay_text_style', 'mood_traits', 'negative_rules', 'example_board',
]

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('brand_imagery_profiles')
    .select('*')
    .eq('workspace_id', session.workspaceId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const supabase = await createClient()

  const update: ImageryUpdate = { updated_at: new Date().toISOString() }
  for (const key of ALLOWED_FIELDS) {
    if (key in body) (update as Record<string, unknown>)[key] = body[key]
  }

  const { data, error } = await supabase
    .from('brand_imagery_profiles')
    .update(update)
    .eq('workspace_id', session.workspaceId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
