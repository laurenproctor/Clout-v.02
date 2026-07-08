import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { resolveCampaignStamp } from '@/lib/campaigns/saveStamp'
import { z } from 'zod'

// Promote a generated visual asset to a Studio output (image-only draft).
// The domain primitive is "promote a visual asset to a Studio output" — broader than
// the Image creator (later: blog hero, carousel slides, standalone IG visuals). The
// Image creator is the first caller; the general home may become /api/studio/promote-visual-asset.
//
// Atomic + idempotent: prefers the save_image_asset_to_output RPC (single transaction,
// row lock, returns the existing link if already promoted). Falls back to a
// conditional-update + cleanup path only if the RPC isn't present yet.
const bodySchema = z.object({
  assetId:    z.string().uuid(),
  title:      z.string().optional(),
  campaignId: z.string().uuid().nullable().optional(),
})

interface PromotionResult {
  outputId:      string
  alreadyLinked: boolean
  assetId:       string
}

interface PromotionRow {
  output_id:      string
  already_linked: boolean
  asset_id:       string
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request' }, { status: 400 })
  }

  const { assetId, title, campaignId } = parsed.data

  // Validate campaign ownership up front (mirrors the other channels' outputs routes).
  const stamp = await resolveCampaignStamp({ campaignId, workspaceId: session.workspaceId })
  if (!stamp.ok) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const supabase = await createClient()

  const result = await promoteVisualAssetToOutput(supabase, {
    assetId,
    workspaceId: session.workspaceId,
    title: title ?? null,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status })
  }

  // Promotion (RPC or fallback) creates the outputs row without campaign fields, so
  // stamp them in a follow-up update. Only for a freshly-created output — an
  // idempotent re-save must not overwrite an existing draft's campaign.
  if (!result.alreadyLinked && Object.keys(stamp.fields).length > 0) {
    const { error: stampErr } = await supabase
      .from('outputs')
      .update(stamp.fields)
      .eq('id', result.outputId)
      .eq('workspace_id', session.workspaceId)
    if (stampErr) console.warn('[create/image/outputs] campaign stamp failed', stampErr)
  }

  return NextResponse.json(result, { status: result.alreadyLinked ? 200 : 201 })
}

type SupabaseLike = Awaited<ReturnType<typeof createClient>>

async function promoteVisualAssetToOutput(
  supabase: SupabaseLike,
  params: { assetId: string; workspaceId: string; title: string | null },
): Promise<PromotionResult | { error: string; status: number }> {
  const { assetId, workspaceId, title } = params

  // ── Primary: atomic RPC ─────────────────────────────────────────────────────
  // Call inline (not via an extracted variable) so the supabase-js `this` binding is
  // preserved; `as never` bypasses the typed overloads (the RPC isn't in the generated
  // Database types until migrations are applied).
  const rpc = await supabase.rpc(
    'save_image_asset_to_output' as never,
    { p_asset_id: assetId, p_workspace_id: workspaceId, p_title: title } as never,
  ) as { data: PromotionRow[] | PromotionRow | null; error: { code?: string; message?: string } | null }

  if (!rpc.error) {
    const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data
    if (!row) return { error: 'Image not found', status: 404 }
    return { outputId: row.output_id, alreadyLinked: row.already_linked, assetId: row.asset_id }
  }

  // asset_not_found raised inside the function → 404
  if (rpc.error.message?.includes('asset_not_found') || rpc.error.code === 'P0001') {
    return { error: 'Image not found', status: 404 }
  }

  // RPC missing (not yet migrated) → fall back. Otherwise surface the error.
  const undefinedFn = rpc.error.code === '42883' || rpc.error.code === 'PGRST202' ||
    /could not find the function|does not exist/i.test(rpc.error.message ?? '')
  if (!undefinedFn) {
    console.error('[create/image/outputs] rpc failed', rpc.error)
    return { error: 'Could not save to Studio.', status: 500 }
  }

  // ── Fallback (RPC not present): conditional update + cleanup ─────────────────
  return promoteFallback(supabase, params)
}

async function promoteFallback(
  supabase: SupabaseLike,
  params: { assetId: string; workspaceId: string; title: string | null },
): Promise<PromotionResult | { error: string; status: number }> {
  const { assetId, workspaceId, title } = params

  const { data: asset } = await supabase
    .from('visual_assets')
    .select('id, workspace_id, output_id')
    .eq('id', assetId)
    .maybeSingle()

  if (!asset || asset.workspace_id !== workspaceId) {
    return { error: 'Image not found', status: 404 }
  }
  if (asset.output_id) {
    return { outputId: asset.output_id, alreadyLinked: true, assetId }
  }

  const { data: output, error: insertErr } = await supabase
    .from('outputs')
    .insert({
      workspace_id: workspaceId,
      status:       'draft',
      content_type: 'image',
      title:        title?.trim() || null,
      content:      { body: '', selectedVisualAssetId: assetId, sourceCreator: 'create/image' },
      channel_id:   null,
    })
    .select('id')
    .single()

  if (insertErr || !output) {
    return { error: 'Could not save to Studio.', status: 500 }
  }

  // Link only if still unlinked — guards against a double-click race.
  const { data: linked, error: linkErr } = await supabase
    .from('visual_assets')
    .update({ output_id: output.id })
    .eq('id', assetId)
    .eq('workspace_id', workspaceId)
    .is('output_id', null)
    .select('id')

  if (linkErr || !linked || linked.length === 0) {
    // Lost the race or link failed — delete the just-inserted output (no orphan) and
    // return the asset's now-existing link if there is one.
    await supabase.from('outputs').delete().eq('id', output.id)
    const { data: reread } = await supabase
      .from('visual_assets')
      .select('output_id')
      .eq('id', assetId)
      .maybeSingle()
    if (reread?.output_id) {
      return { outputId: reread.output_id, alreadyLinked: true, assetId }
    }
    return { error: 'Could not link image to draft.', status: 500 }
  }

  return { outputId: output.id, alreadyLinked: false, assetId }
}
