'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface WorkspaceData {
  workspace: { id: string; name: string; slug: string; plan: string } | null
  memberCount: number
  userRole: string
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

export default function WorkspaceSettingsPage() {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/workspace')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setData(d)
          setName(d.workspace?.name ?? '')
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/workspace', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Save failed')
    }
    setSaving(false)
  }

  const canEdit = data?.userRole === 'owner' || data?.userRole === 'admin'
  const isDirty = name !== (data?.workspace?.name ?? '')

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-6 w-48 rounded bg-zinc-200 animate-pulse" />
        <div className="h-48 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Workspace</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Settings for your workspace.</p>
      </div>

      {/* General */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">General</h2>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Workspace name
          </label>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            placeholder="Workspace name"
          />
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Slug
          </label>
          <p className="mt-1.5 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm text-zinc-400 font-mono">
            {data?.workspace?.slug ?? '—'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">Slug cannot be changed after creation.</p>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
          <p className="text-sm text-zinc-500">
            <span className="font-medium text-zinc-900">{data?.memberCount ?? 0}</span>{' '}
            {data?.memberCount === 1 ? 'member' : 'members'}
            {' · '}
            <span className="capitalize">{data?.userRole}</span>
          </p>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                saving || !isDirty
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save'}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Plan */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-900">Plan</h2>
            <p className="mt-0.5 text-sm text-zinc-500">
              {PLAN_LABELS[data?.workspace?.plan ?? 'free'] ?? 'Free'}
            </p>
          </div>
          <Link
            href="/billing"
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Manage billing →
          </Link>
        </div>
      </div>
    </div>
  )
}
