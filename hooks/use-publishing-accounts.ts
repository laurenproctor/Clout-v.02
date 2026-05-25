'use client'

import { useState, useEffect, useCallback } from 'react'
import type { PublishingAccount } from '@/app/api/publishing/accounts/route'

export type { PublishingAccount }

const STORAGE_KEY = (workspaceId: string) => `clout-publishing-accounts-${workspaceId}`

export function usePublishingAccounts(workspaceId: string) {
  const [accounts, setAccounts] = useState<PublishingAccount[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/publishing/accounts')
      .then(r => r.ok ? r.json() : { accounts: [] })
      .then(d => {
        const accs: PublishingAccount[] = d.accounts ?? []
        setAccounts(accs)

        const stored = localStorage.getItem(STORAGE_KEY(workspaceId))
        if (stored) {
          try {
            const parsed: string[] = JSON.parse(stored)
            const valid = parsed.filter(id => accs.some(a => a.credentialId === id))
            setSelected(new Set(valid))
          } catch {
            setSelected(new Set(accs.map(a => a.credentialId)))
          }
        } else {
          setSelected(new Set(accs.map(a => a.credentialId)))
        }
        setLoading(false)
      })
  }, [workspaceId])

  const toggle = useCallback((credentialId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(credentialId)) {
        next.delete(credentialId)
      } else {
        next.add(credentialId)
      }
      localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify([...next]))
      return next
    })
  }, [workspaceId])

  const byPlatform = accounts.reduce<Record<string, PublishingAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = []
    acc[a.platform].push(a)
    return acc
  }, {})

  return { accounts, selected, toggle, loading, byPlatform }
}
