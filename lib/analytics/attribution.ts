import { createServiceClient } from '@/lib/supabase/service'
import { buildUTMParams } from './utm'

// The typed schema has empty Relationships arrays, so the Supabase client cannot infer
// the join shape on `outputs`; content_attribution is also a post-migration table absent
// from generated types. This minimal surface narrows the escape-hatch cast below.
interface UntypedQuery extends PromiseLike<{ data: Record<string, unknown> | null }> {
  select(columns: string): UntypedQuery
  upsert(values: Record<string, unknown>, opts?: { onConflict?: string }): UntypedQuery
  eq(column: string, value: unknown): UntypedQuery
  single(): UntypedQuery
}
interface UntypedClient {
  from(table: string): UntypedQuery
}

interface OutputWithJoins {
  id: string
  workspace_id: string
  generation_id: string | null
  channel_id: string | null
  generation_group_id: string | null
  channels: { platform: string } | null
  generations: { lens_id: string; lenses: { lens_type: string | null } | null } | null
}

export async function tagOutputWithAttribution(params: {
  outputId: string
  workspaceId: string
}): Promise<void> {
  const supabase = createServiceClient()

  // Look up output + channel platform + generation lens_id in one query.
  // Cast to any first because the typed schema has empty Relationships arrays,
  // so the Supabase client cannot infer the join shape.
  const { data: output } = await (supabase as unknown as UntypedClient)
    .from('outputs')
    .select('id, workspace_id, generation_id, channel_id, generation_group_id, channels(platform), generations(lens_id, lenses(lens_type))')
    .eq('id', params.outputId)
    .eq('workspace_id', params.workspaceId)
    .single() as { data: OutputWithJoins | null }

  if (!output) return

  const platform = output.channels?.platform ?? 'unknown'
  const lensId = output.generations?.lens_id ?? null
  const narrativeType = output.generations?.lenses?.lens_type ?? null
  const canonicalId = output.generation_group_id ?? params.outputId

  const utmParams = buildUTMParams({
    platform,
    canonicalId,
    outputId: params.outputId,
  })

  // Upsert to content_attribution (table from the analytics migration)
  await (supabase as unknown as UntypedClient)
    .from('content_attribution')
    .upsert({
      output_id: params.outputId,
      workspace_id: params.workspaceId,
      canonical_content_id: canonicalId,
      platform,
      utm_source: utmParams.utm_source,
      utm_medium: utmParams.utm_medium,
      utm_campaign: utmParams.utm_campaign,
      utm_content: utmParams.utm_content ?? null,
      lens_id: lensId,
      narrative_type: narrativeType,
    }, { onConflict: 'output_id' })
}
