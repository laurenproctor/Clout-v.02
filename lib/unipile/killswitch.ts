import { createServiceClient } from '@/lib/supabase/service'

// Global admin kill switch for all Unipile activity. Backed by feature_kill_switches
// so admins can flip it at runtime (no redeploy). Read on every outbound call, with a
// short in-process cache to avoid hammering the DB under bursts.

export const UNIPILE_KILL_KEY = 'unipile'

const CACHE_TTL_MS = 5_000
let cache: { disabled: boolean; expiresAt: number } | null = null

// Exposed for tests — lets a test reset the module-level cache between cases.
export function _resetKillSwitchCache(): void {
  cache = null
}

// Returns true when the Unipile connector is killed (all activity must stop).
// Fails closed: if the flag can't be read, treat the connector as killed.
export async function isUnipileKilled(now: number = Date.now()): Promise<boolean> {
  if (cache && now < cache.expiresAt) return cache.disabled

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data, error } = await supabase
    .from('feature_kill_switches')
    .select('disabled')
    .eq('key', UNIPILE_KILL_KEY)
    .maybeSingle()

  if (error) {
    console.error(JSON.stringify({ event: 'unipile.killswitch_read_failed', error: error.message }))
    return true // fail closed
  }

  const disabled = data?.disabled ?? false
  cache = { disabled, expiresAt: now + CACHE_TTL_MS }
  return disabled
}
