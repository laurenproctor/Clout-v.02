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
    const controller = new AbortController()
    setLoading(true)

    fetch('/api/publishing/accounts', { signal: controller.signal })
      .then(r => r.ok ? r.json() : { accounts: [] })
      .then(d => {
        const accs: PublishingAccount[] = d.accounts ?? []
        setAccounts(accs)

        const stored = localStorage.getItem(STORAGE_KEY(workspaceId))
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (!Array.isArray(parsed)) throw new Error('invalid')
            const valid = (parsed as unknown[]).filter(
              (id): id is string => typeof id === 'string' && accs.some(a => a.credentialId === id)
            )
            setSelected(new Set(valid))
          } catch {
            setSelected(new Set(accs.map(a => a.credentialId)))
          }
        } else {
          setSelected(new Set(accs.map(a => a.credentialId)))
        }
        setLoading(false)
      })
      .catch(err => {
        if (err instanceof Error && err.name === 'AbortError') return
        setLoading(false)
      })

    return () => controller.abort()
  }, [workspaceId])

  const toggle = useCallback((credentialId: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(credentialId)) {
        next.delete(credentialId)
      } else {
        next.add(credentialId)
      }
      return next
    })
  }, [])

  useEffect(() => {
    if (loading) return
    localStorage.setItem(STORAGE_KEY(workspaceId), JSON.stringify([...selected]))
  }, [selected, workspaceId, loading])

  const byPlatform = accounts.reduce<Record<string, PublishingAccount[]>>((acc, a) => {
    if (!acc[a.platform]) acc[a.platform] = []
    acc[a.platform].push(a)
    return acc
  }, {})

  return { accounts, selected, toggle, loading, byPlatform }
}
