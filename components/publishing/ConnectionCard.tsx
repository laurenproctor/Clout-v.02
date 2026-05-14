'use client'

import { useState } from 'react'
import { Globe, Trash2, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'

interface ConnectionCardProps {
  connection: ProviderConnectionSafe
  onDelete: (id: string) => void
}

type TestStatus = 'idle' | 'testing' | 'ok' | 'fail'

export function ConnectionCard({ connection, onDelete }: ConnectionCardProps) {
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testError, setTestError]   = useState<string | null>(null)
  const [deleting, setDeleting]     = useState(false)

  const isDegraded = connection.consecutiveFailureCount >= 3

  async function handleTest() {
    setTestStatus('testing')
    setTestError(null)
    try {
      const res = await fetch(`/api/publishing/connections/${connection.id}/test`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; error?: string }
      setTestStatus(data.ok ? 'ok' : 'fail')
      if (!data.ok) setTestError(data.error ?? 'Test failed')
    } catch {
      setTestStatus('fail')
      setTestError('Network error')
    }
    setTimeout(() => setTestStatus('idle'), 4000)
  }

  async function handleDelete() {
    if (!confirm(`Remove "${connection.label}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/publishing/connections/${connection.id}`, { method: 'DELETE' })
      if (res.ok) onDelete(connection.id)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className={`flex items-start gap-4 rounded-lg border bg-white p-4 ${isDegraded ? 'border-amber-200' : 'border-zinc-200'}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50">
        <Globe className="h-4 w-4 text-zinc-500" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-zinc-900">{connection.label}</p>
          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
            {connection.provider}
          </span>
          {isDegraded && (
            <span className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertTriangle className="h-3 w-3" /> Degraded
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-zinc-400">{connection.siteUrl}</p>
        {connection.lastSuccessfulPublishAt && testStatus === 'idle' && !isDegraded && (
          <p className="mt-0.5 text-[11px] text-zinc-300">
            Last published {new Date(connection.lastSuccessfulPublishAt).toLocaleDateString()}
          </p>
        )}
        {isDegraded && connection.lastErrorMessage && testStatus === 'idle' && (
          <p className="mt-1 truncate text-xs text-amber-600">{connection.lastErrorMessage}</p>
        )}
        {testStatus === 'ok' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 className="h-3 w-3" /> Connected
          </p>
        )}
        {testStatus === 'fail' && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-500">
            <XCircle className="h-3 w-3" /> {testError ?? 'Connection failed'}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={handleTest}
          disabled={testStatus === 'testing'}
          className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50"
        >
          {testStatus === 'testing' ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Test'}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          aria-label="Remove connection"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  )
}
