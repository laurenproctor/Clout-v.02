import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/types/db'
import type { DomainResult } from '@/types/domain'
import type { StoredCreateRecommendation } from '@/lib/create/recommendTypes'

// Phase 1 persists the create-recommendation on the brief Capture's `structured_data`
// jsonb under a `createRecommendation` key. This avoids a dedicated table/migration
// while keeping the recommendation durable and workspace-scoped (the capture row is
// already RLS-protected and has a user-facing detail view). A future phase can lift
// this into a dedicated `create_recommendations` table if multiple recommendations
// per capture are ever needed.
//
// NOTE: the server Supabase client uses the service role and BYPASSES RLS, so every
// query here filters `workspace_id` explicitly for authorization.

const REC_KEY = 'createRecommendation'

export async function saveCreateRecommendation(params: {
  captureId: string
  workspaceId: string
  recommendation: StoredCreateRecommendation
}): Promise<DomainResult<StoredCreateRecommendation>> {
  const supabase = await createClient()

  // Merge into any existing structured_data so we don't clobber file/topic metadata.
  const { data: existing, error: readErr } = await supabase
    .from('captures')
    .select('structured_data')
    .eq('id', params.captureId)
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .single()

  if (readErr) return { ok: false, error: readErr.message }

  const current = (existing?.structured_data ?? {}) as Record<string, unknown>
  const merged = { ...current, [REC_KEY]: params.recommendation }

  const { error: writeErr } = await supabase
    .from('captures')
    .update({ structured_data: merged as unknown as Json, updated_at: new Date().toISOString() })
    .eq('id', params.captureId)
    .eq('workspace_id', params.workspaceId)

  if (writeErr) return { ok: false, error: writeErr.message }
  return { ok: true, data: params.recommendation }
}

export async function getCreateRecommendationByCapture(params: {
  captureId: string
  workspaceId: string
}): Promise<DomainResult<StoredCreateRecommendation | null>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('captures')
    .select('structured_data')
    .eq('id', params.captureId)
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .single()

  if (error) return { ok: false, error: error.message }

  const structured = (data?.structured_data ?? null) as Record<string, unknown> | null
  const rec = structured?.[REC_KEY]
  return { ok: true, data: (rec as StoredCreateRecommendation | undefined) ?? null }
}
