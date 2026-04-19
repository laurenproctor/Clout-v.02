import { createClient } from '@/lib/supabase/server'
import type { Lens, CreateLensInput, UpdateLensInput, DomainResult } from '@/types/domain'

function toLens(row: Record<string, unknown>): Lens {
  return {
    id: row.id as string,
    workspaceId: row.workspace_id as string | null,
    createdBy: row.created_by as string | null,
    scope: row.scope as Lens['scope'],
    name: row.name as string,
    description: row.description as string | null,
    systemPrompt: row.system_prompt as string,
    tags: row.tags as string[],
    isActive: row.is_active as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function getLensById(id: string): Promise<DomainResult<Lens>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .select()
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toLens(data as Record<string, unknown>) }
}

export async function listLenses(params: {
  workspaceId: string
}): Promise<DomainResult<Lens[]>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .select()
    .or(`scope.eq.system,workspace_id.eq.${params.workspaceId}`)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('scope', { ascending: false })
    .order('name', { ascending: true })

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: (data as Record<string, unknown>[]).map(toLens) }
}

export async function createLens(input: CreateLensInput): Promise<DomainResult<Lens>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.createdBy,
      scope: input.scope ?? 'workspace',
      name: input.name,
      description: input.description ?? null,
      system_prompt: input.systemPrompt,
      tags: input.tags ?? [],
    })
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toLens(data as Record<string, unknown>) }
}

export async function updateLens(
  id: string,
  input: UpdateLensInput
): Promise<DomainResult<Lens>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lenses')
    .update({
      ...(input.name && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.systemPrompt && { system_prompt: input.systemPrompt }),
      ...(input.tags && { tags: input.tags }),
      ...(input.isActive !== undefined && { is_active: input.isActive }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, data: toLens(data as Record<string, unknown>) }
}
