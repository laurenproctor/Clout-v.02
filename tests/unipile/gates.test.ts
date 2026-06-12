import { describe, it, expect } from 'vitest'
import { decideGate, type GateState } from '@/lib/unipile/gates'

const ALLOWED: GateState = {
  masterEnabled: true,
  killed: false,
  workspaceGateOn: true,
  userAccepted: true,
}

describe('decideGate', () => {
  it('allows when every layer is satisfied', () => {
    expect(decideGate(ALLOWED)).toEqual({ allowed: true })
  })

  it('denies master_disabled first, even if everything else is off too', () => {
    expect(decideGate({ ...ALLOWED, masterEnabled: false, killed: true, workspaceGateOn: false, userAccepted: false }))
      .toEqual({ allowed: false, reason: 'master_disabled' })
  })

  it('denies killed before workspace/opt-in', () => {
    expect(decideGate({ ...ALLOWED, killed: true, workspaceGateOn: false, userAccepted: false }))
      .toEqual({ allowed: false, reason: 'killed' })
  })

  it('denies workspace_gate_off before opt-in', () => {
    expect(decideGate({ ...ALLOWED, workspaceGateOn: false, userAccepted: false }))
      .toEqual({ allowed: false, reason: 'workspace_gate_off' })
  })

  it('denies opt_in_required when only the opt-in is missing', () => {
    expect(decideGate({ ...ALLOWED, userAccepted: false }))
      .toEqual({ allowed: false, reason: 'opt_in_required' })
  })
})
