import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebsiteAnalysisResult } from '@/lib/website-intelligence/analyze'

interface CacheShape {
  items: object[]
  gaps: object[]
  assets: object[]
  analyzed_at?: string
}

export async function readCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  workspaceId: string,
): Promise<CacheShape> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('workspace_feed_settings')
    .select('website_feed_cache')
    .eq('workspace_id', workspaceId)
    .maybeSingle() as { data: { website_feed_cache: CacheShape | null } | null }

  return data?.website_feed_cache ?? { items: [], gaps: [], assets: [] }
}

export async function writeCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  workspaceId: string,
  cache: CacheShape,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('workspace_feed_settings')
    .update({
      website_feed_cache: { ...cache, analyzed_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId)
}

export function mergeIntoCache(
  existing: CacheShape,
  newResult: WebsiteAnalysisResult,
): CacheShape {
  // Merge new results into existing, deduplicating by id
  const existingItemIds = new Set((existing.items as Array<{ id?: string }>).map(i => i.id).filter(Boolean))
  const existingGapIds = new Set((existing.gaps as Array<{ id?: string }>).map(g => g.id).filter(Boolean))
  const existingAssetIds = new Set((existing.assets as Array<{ id?: string }>).map(a => a.id).filter(Boolean))

  const newItems = (newResult.items as Array<{ id?: string }>).filter(i => !existingItemIds.has(i.id))
  const newGaps = (newResult.gaps as Array<{ id?: string }>).filter(g => !existingGapIds.has(g.id))
  const newAssets = (newResult.assets as Array<{ id?: string }>).filter(a => !existingAssetIds.has(a.id))

  return {
    items: [...existing.items, ...newItems],
    gaps: [...existing.gaps, ...newGaps],
    assets: [...existing.assets, ...newAssets],
  }
}
