import { FEATURES } from '@/lib/features'
import { createServiceClient } from '@/lib/supabase/service'
import { isUnipileKilled } from './killswitch'
import { DISCLOSURE_VERSION } from './disclosure'
import { getUnipileConnection } from './connection'

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

// Gate for the *connect* step specifically. Connecting is a prerequisite for every
// capability, so it does not require any per-capability workspace toggle — only that
// the connector is enabled (master + not killed) and the user has accepted the current
// disclosure. Returns the deny reason so the connect route can branch the redirect.
export async function evaluateUnipileConnect(params: {
  workspaceId: string
  userId: string
}): Promise<GateResult> {
  const masterEnabled = FEATURES.linkedinUnipileEnabled
  if (!masterEnabled) return { allowed: false, reason: 'master_disabled' }

  const killed = await isUnipileKilled()
  if (killed) return { allowed: false, reason: 'killed' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data: optin } = await supabase
    .from('linkedin_connector_optins')
    .select('disclosure_version')
    .eq('user_id', params.userId)
    .eq('workspace_id', params.workspaceId)
    .maybeSingle()

  if (optin?.disclosure_version !== DISCLOSURE_VERSION) {
    return { allowed: false, reason: 'opt_in_required' }
  }
  return { allowed: true }
}

// Gate for *background monitoring*. Runs with no user context, so it does NOT check
// per-user opt-in (that was enforced at connect time). Requires: master flag, kill
// switch off, the workspace monitoring beta toggle, and a live connection.
export type MonitoringDenyReason =
  | 'master_disabled'
  | 'killed'
  | 'monitoring_gate_off'
  | 'not_connected'

export interface MonitoringGateResult {
  allowed: boolean
  reason?: MonitoringDenyReason
  message?: string
}

const MONITORING_MESSAGES: Record<MonitoringDenyReason, string> = {
  master_disabled:     'LinkedIn Monitoring Beta is currently unavailable.',
  killed:              'LinkedIn Monitoring Beta is temporarily disabled.',
  monitoring_gate_off: 'Enable LinkedIn Monitoring Beta for this workspace first.',
  not_connected:       'Connect the LinkedIn Monitoring Beta connector before adding LinkedIn keyword monitors.',
}

export async function evaluateUnipileMonitoring(params: {
  workspaceId: string
}): Promise<MonitoringGateResult> {
  const deny = (reason: MonitoringDenyReason): MonitoringGateResult =>
    ({ allowed: false, reason, message: MONITORING_MESSAGES[reason] })

  if (!FEATURES.linkedinUnipileEnabled) return deny('master_disabled')
  if (await isUnipileKilled()) return deny('killed')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServiceClient() as any
  const { data: settings } = await supabase
    .from('workspace_feed_settings')
    .select('linkedin_beta')
    .eq('workspace_id', params.workspaceId)
    .maybeSingle()
  if (settings?.linkedin_beta?.monitoring !== true) return deny('monitoring_gate_off')

  const connection = await getUnipileConnection(params.workspaceId)
  if (!connection || connection.status !== 'connected') return deny('not_connected')

  return { allowed: true }
}
