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
    .from('visual_generation_sessions')
    .select('*')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? null)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { outputId, aspectRatio, quality, visualObjective, audienceFrame, emotionalTone, keyIdea, generationMode } = body as {
    outputId: string
    aspectRatio?: string
    quality?: string
    visualObjective?: string
    audienceFrame?: string
    emotionalTone?: string
    keyIdea?: string
    generationMode?: string
  }

  if (!outputId) return NextResponse.json({ error: 'outputId is required' }, { status: 400 })

  const supabase = await createClient()

  // Get current max version and active session id for this output
  const { data: existing } = await supabase
    .from('visual_generation_sessions')
    .select('id, version')
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Deactivate all existing sessions for this output
  await supabase
    .from('visual_generation_sessions')
    .update({ is_active: false })
    .eq('output_id', outputId)
    .eq('workspace_id', session.workspaceId)

  // Insert new versioned session
  const { data, error } = await supabase
    .from('visual_generation_sessions')
    .insert({
      workspace_id:      session.workspaceId,
      output_id:         outputId,
      parent_session_id: existing?.id ?? null,
      version:           (existing?.version ?? 0) + 1,
      is_active:         true,
      aspect_ratio:      aspectRatio ?? 'landscape',
      quality:           quality ?? 'standard',
      visual_objective:  visualObjective ?? null,
      audience_frame:    audienceFrame ?? null,
      emotional_tone:    emotionalTone ?? null,
      key_idea:          keyIdea ?? null,
      generation_mode:   generationMode ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
