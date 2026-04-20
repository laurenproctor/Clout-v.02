import { createClient } from '@/lib/supabase/server'
import type { Capture, PrivateEnrichment } from '@/types/domain'

function toCapture(row: Record<string, unknown>): Capture {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string,
    createdBy: row.created_by as string,
    source: row.source as Capture['source'],
    status: row.status as Capture['status'],
    rawContent: row.raw_content as string | null,
    sourceUrl: row.source_url as string | null,
    structuredData: row.structured_data as Record<string, unknown> | null,
    audioPath: row.audio_path as string | null,
    transcript: row.transcript as string | null,
    notes: row.notes as string | null,
    isPrivate: row.is_private as boolean,
    tags: row.tags as string[],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toEnrichment(row: Record<string, unknown>): PrivateEnrichment {
  return {
    id: row.id as string,
    captureId: row.capture_id as string,
    workspaceId: row.workspace_id as string,
    lensId: row.lens_id as string | null,
    content: row.content as string,
    insights: row.insights as Array<{ title: string; body: string }>,
    model: row.model as string,
    createdAt: row.created_at as string,
  }
}

export async function getPrivateFeed(params: {
  workspaceId: string
  createdBy: string
  tags?: string[]
  limit?: number
  offset?: number
}): Promise<Capture[]> {
  const supabase = await createClient()
  let query = supabase
    .from('captures')
    .select()
    .eq('workspace_id', params.workspaceId)
    .eq('created_by', params.createdBy)
    .eq('is_private', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.tags && params.tags.length > 0) {
    query = query.overlaps('tags', params.tags)
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1)
  }

  const { data } = await query
  return (data ?? []).map((r) => toCapture(r as Record<string, unknown>))
}

export async function getEnrichedFeed(params: {
  workspaceId: string
  createdBy: string
  tags?: string[]
}): Promise<PrivateEnrichment[]> {
  const supabase = await createClient()

  // Get private captures for this user, then their enrichments
  let captureQuery = supabase
    .from('captures')
    .select('id')
    .eq('workspace_id', params.workspaceId)
    .eq('created_by', params.createdBy)
    .eq('is_private', true)
    .is('deleted_at', null)

  if (params.tags && params.tags.length > 0) {
    captureQuery = captureQuery.overlaps('tags', params.tags)
  }

  const { data: captures } = await captureQuery
  if (!captures || captures.length === 0) return []

  const captureIds = captures.map((c) => c.id)

  const { data: enrichments } = await supabase
    .from('private_enrichments')
    .select()
    .in('capture_id', captureIds)
    .order('created_at', { ascending: false })

  return (enrichments ?? []).map((r) => toEnrichment(r as Record<string, unknown>))
}

export async function getEnrichmentForCapture(
  captureId: string
): Promise<PrivateEnrichment | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('private_enrichments')
    .select()
    .eq('capture_id', captureId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return null
  return toEnrichment(data as Record<string, unknown>)
}

export async function updatePrivateFeedVisibility(params: {
  workspaceId: string
  visible: boolean
}): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('profiles')
    .update({ private_feed_operator_visible: params.visible })
    .eq('workspace_id', params.workspaceId)
}
