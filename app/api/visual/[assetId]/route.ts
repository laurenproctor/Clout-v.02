// app/api/visual/[assetId]/route.ts
// Status polling endpoint for async visual asset generation.
// Client polls this until status = 'completed' or 'failed'.

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { assetId } = await params

  const supabase = await createClient()
  // Select only the columns that exist in the generated types (Phase 2 columns may not be in types yet)
  const { data: row, error } = await supabase
    .from('visual_assets')
    .select('id, workspace_id, status, original_url, visual_intent, prompt, aspect_ratio, generation_mode, generation_group_id, created_at')
    .eq('id', assetId)
    .single()

  if (error || !row) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }

  if (row.workspace_id !== session.workspaceId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Phase 2 columns (template_id, composed_url) are queried separately via raw cast
  // until generated types are updated to include the migration columns.
  const extended = row as Record<string, unknown>

  return NextResponse.json({
    assetId:           row.id,
    status:            row.status,
    url:               String(extended.composed_url ?? row.original_url),
    backgroundUrl:     row.original_url,
    composedUrl:       (extended.composed_url as string | null) ?? null,
    templateId:        (extended.template_id as string | null) ?? null,
    visualIntent:      row.visual_intent,
    prompt:            row.prompt,
    aspectRatio:       row.aspect_ratio,
    mode:              row.generation_mode,
    generationGroupId: row.generation_group_id,
    createdAt:         row.created_at,
  })
}
