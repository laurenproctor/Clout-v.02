import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebsiteAnalysisResult } from '@/lib/website-intelligence/analyze'

export interface CacheShape {
  items: object[]
  gaps: object[]
  assets: object[]
  analyzed_at?: string
  extraction_method?: 'readability' | 'jina'
  duration_ms?: number
  version?: number
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

/**
 * Merge a fresh analysis into the cached one, keyed by id.
 *
 * Both modes PRESERVE existing entries that the new result doesn't mention — so a
 * partial or failed re-analysis can never wipe previously-discovered content
 * (e.g. blog posts that this run didn't re-crawl). They differ only on id
 * collisions:
 *  - default (append-only): the existing entry wins — used by `add-url`/`upload`
 *    where each call contributes a distinct new source.
 *  - `preferNew`: the new entry wins — used by the full re-analyze path so
 *    re-crawled pages get refreshed in place rather than frozen at first analysis.
 */
export function mergeIntoCache(
  existing: CacheShape,
  newResult: WebsiteAnalysisResult,
  opts: { preferNew?: boolean } = {},
): CacheShape {
  const mergeList = (existingList: object[], newList: object[]): object[] => {
    const ex = existingList as Array<{ id?: string }>
    const nw = newList as Array<{ id?: string }>
    if (opts.preferNew) {
      const newIds = new Set(nw.map(i => i.id).filter(Boolean))
      const preserved = ex.filter(i => !newIds.has(i.id))
      return [...preserved, ...nw]
    }
    const existingIds = new Set(ex.map(i => i.id).filter(Boolean))
    const added = nw.filter(i => !existingIds.has(i.id))
    return [...ex, ...added]
  }

  return {
    items: mergeList(existing.items, newResult.items),
    gaps: mergeList(existing.gaps, newResult.gaps),
    assets: mergeList(existing.assets, newResult.assets),
    extraction_method: newResult.meta.extractionMethod,
    duration_ms: newResult.meta.durationMs,
    version: newResult.meta.version,
  }
}
