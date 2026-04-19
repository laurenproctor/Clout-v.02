import { createClient } from '@/lib/supabase/server'
import type { Capture, CreateCaptureInput, UpdateCaptureInput, DomainResult } from '@/types/domain'
import type { Json } from '@/types/db'

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

export async function createCapture(
  input: CreateCaptureInput
): Promise<DomainResult<Capture>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('captures')
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      source: input.source,
      raw_content: input.rawContent ?? null,
      source_url: input.sourceUrl ?? null,
      structured_data: (input.structuredData ?? null) as Json | null,
      is_private: input.isPrivate ?? false,
      tags: input.tags ?? [],
      status: 'pending',
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCapture(data as Record<string, unknown>) }
}

export async function getCapture(captureId: string): Promise<DomainResult<Capture>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('captures')
    .select()
    .eq('id', captureId)
    .is('deleted_at', null)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCapture(data as Record<string, unknown>) }
}

export async function listCaptures(params: {
  workspaceId: string
  isPrivate?: boolean
  limit?: number
  offset?: number
}): Promise<DomainResult<Capture[]>> {
  const supabase = await createClient()
  let query = supabase
    .from('captures')
    .select()
    .eq('workspace_id', params.workspaceId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(params.limit ?? 50)

  if (params.isPrivate !== undefined) {
    query = query.eq('is_private', params.isPrivate)
  }
  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit ?? 50) - 1)
  }

  const { data, error } = await query
  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toCapture) }
}

export async function updateCapture(
  captureId: string,
  input: UpdateCaptureInput
): Promise<DomainResult<Capture>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('captures')
    .update({
      ...(input.status && { status: input.status }),
      ...(input.rawContent !== undefined && { raw_content: input.rawContent }),
      ...(input.transcript !== undefined && { transcript: input.transcript }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.tags && { tags: input.tags }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', captureId)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toCapture(data as Record<string, unknown>) }
}
