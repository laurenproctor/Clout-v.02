import { FEATURES } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase/service'
import { isUnipileKilled } from './killswitch'
import { DISCLOSURE_VERSION } from './disclosure'

// Central authorization chokepoint for the LinkedIn beta connector. Every Unipile
// route and client method must pass through assertUnipileAllowed() before any
// outbound call. The decision is layered and checked in priority order so the
// most fundamental "off" always wins.

export type UnipileCapability = 'monitoring' | 'assistedEngagement' | 'pageFallback'

export type GateDenyReason =
  | 'master_disabled'      // LINKEDIN_UNIPILE_ENABLED is false
  | 'killed'               // admin kill switch is on
  | 'workspace_gate_off'   // the per-workspace beta toggle for this capability is off
  | 'opt_in_required'      // user has not accepted the current disclosure version

const CAPABILITY_GATE_KEY: Record<UnipileCapability, string> = {
  monitoring:         'monitoring',
  assistedEngagement: 'assistedEngagement',
  pageFallback:       'pageFallback',
}

export interface GateState {
  masterEnabled: boolean
  killed: boolean
  workspaceGateOn: boolean
  userAccepted: boolean
}

export interface GateResult {
  allowed: boolean
  reason?: GateDenyReason
}

// Pure decision — easy to unit test exhaustively. Priority: master → killed →
// workspace gate → opt-in.
export function decideGate(state: GateState): GateResult {
  if (!state.masterEnabled)   return { allowed: false, reason: 'master_disabled' }
  if (state.killed)           return { allowed: false, reason: 'killed' }
  if (!state.workspaceGateOn) return { allowed: false, reason: 'workspace_gate_off' }
  if (!state.userAccepted)    return { allowed: false, reason: 'opt_in_required' }
  return { allowed: true }
}

export class UnipileGateError extends Error {
  constructor(public readonly reason: GateDenyReason, public readonly capability: UnipileCapability) {
    super(`Unipile ${capability} blocked: ${reason}`)
    this.name = 'UnipileGateError'
  }
}

// Gathers gate state and decides. Returns the result rather than throwing so callers
// can branch on the reason (e.g. render a "setup-required" vs "killed" state).
export async function evaluateUnipileGate(params: {
  workspaceId: string
  userId: string
  capability: UnipileCapability
}): Promise<GateResult> {
  const masterEnabled = FEATURES.linkedinUnipileEnabled

  // Short-circuit: if the master flag is off, don't even read the kill switch / DB.
  if (!masterEnabled) return decideGate({ masterEnabled, killed: false, workspaceGateOn: false, userAccepted: false })

  const killed = await isUnipileKilled()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any

  const [{ data: settings }, { data: optin }] = await Promise.all([
    supabase
      .from('workspace_feed_settings')
      .select('linkedin_beta')
      .eq('workspace_id', params.workspaceId)
      .maybeSingle(),
    supabase
      .from('linkedin_connector_optins')
      .select('disclosure_version')
      .eq('user_id', params.userId)
      .eq('workspace_id', params.workspaceId)
      .maybeSingle(),
  ])

  const gateKey = CAPABILITY_GATE_KEY[params.capability]
  const workspaceGateOn = settings?.linkedin_beta?.[gateKey] === true
  const userAccepted = optin?.disclosure_version === DISCLOSURE_VERSION

  return decideGate({ masterEnabled, killed, workspaceGateOn, userAccepted })
}

// Throwing variant for call sites that just need a hard guard.
export async function assertUnipileAllowed(params: {
  workspaceId: string
  userId: string
  capability: UnipileCapability
}): Promise<void> {
  const result = await evaluateUnipileGate(params)
  if (!result.allowed) {
    throw new UnipileGateError(result.reason!, params.capability)
  }
}
