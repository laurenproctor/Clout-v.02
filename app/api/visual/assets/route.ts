import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const outputId = req.nextUrl.searchParams.get('outputId')
  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('visual_assets')
    .select('id, output_id, original_url, aspect_ratio, mode, render_mode, visual_intent, prompt, created_at')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
