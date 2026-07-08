import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { resolveCampaignStamp } from '@/lib/campaigns/saveStamp'
import type { Json } from '@/types/db'
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
  // Optional creator provenance. The Substack Article creator (/create/substack) reuses
  // this route but tags its drafts so Studio can label them "Substack Article" and so
  // duplicate auto-saves dedupe. Substack Email omits these (stays the default).
  sourceCreator:        z.string().optional(),
  substackFormat:       z.enum(['article', 'newsletter', 'note']).optional(),
  sourceGenerationHash: z.string().optional(),
  campaignId:           z.string().uuid().nullable().optional(),
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

  const { title, subtitle, markdown, wordCount, sourceCreator, substackFormat, sourceGenerationHash, campaignId } = parsed.data

  // Stamp campaign_id (+ default goal) when this article was created for a
  // campaign. Validates the campaign belongs to this workspace.
  const stamp = await resolveCampaignStamp({ campaignId, workspaceId: session.workspaceId })
  if (!stamp.ok) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  const supabase = await createClient()
  const now = new Date().toISOString()

  const content: Record<string, unknown> = {
    body:      markdown,                 // markdown is the editable body (NOT canonical JSON)
    subtitle:  subtitle ?? null,
    wordCount: wordCount ?? null,
  }
  // Creator provenance / dedupe key — only stored when provided (Substack Article).
  if (sourceCreator)        content.sourceCreator = sourceCreator
  if (substackFormat)       content.substackFormat = substackFormat
  if (sourceGenerationHash) content.sourceGenerationHash = sourceGenerationHash

  const { data, error } = await supabase
    .from('outputs')
    .insert({
      workspace_id: session.workspaceId,
      status:       'draft',
      content_type: 'substack-newsletter',  // internal token — never shown to the user
      title:        title,
      content:      content as unknown as Json,
      channel_id:   null,
      ...stamp.fields,
      created_at:   now,
      updated_at:   now,
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    // Idempotency: a duplicate auto-save (stream retry / remount / multi-tab) hits the
    // partial unique index. Re-query by hash and return the existing draft instead.
    if (error.code === '23505' && sourceGenerationHash) {
      const { data: existing } = await supabase
        .from('outputs')
        .select('id, status, created_at')
        .eq('workspace_id', session.workspaceId)
        .eq('content_type', 'substack-newsletter')
        .eq('content->>sourceGenerationHash', sourceGenerationHash)
        .maybeSingle()
      if (existing) return NextResponse.json({ ...existing, deduped: true }, { status: 200 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
