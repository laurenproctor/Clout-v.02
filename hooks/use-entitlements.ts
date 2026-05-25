'use client'

import { useState, useEffect } from 'react'

type CheckName = 'createWorkspace' | 'connectAccount' | 'inviteMember'

function useEntitlementCheck(check: CheckName): boolean | null {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch(`/api/entitlements?check=${check}`)
      .then(r => r.ok ? r.json() : { allowed: true })
      .then(d => setAllowed(d.allowed ?? true))
      .catch(() => setAllowed(true)) // fail open
  }, [check])

  return allowed
}

// Returns true if the user can create another workspace, null while loading.
export function useCanCreateWorkspace(): boolean | null {
  return useEntitlementCheck('createWorkspace')
}

// Returns true if the workspace can connect another account, null while loading.
export function useCanConnectAccount(): boolean | null {
  return useEntitlementCheck('connectAccount')
}

// Returns true if the workspace can invite another member, null while loading.
export function useCanInviteMember(): boolean | null {
  return useEntitlementCheck('inviteMember')
}
