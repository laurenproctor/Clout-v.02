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

      {/* Members */}
      <MembersSection workspaceId={data?.workspace?.id ?? ''} userRole={data?.userRole ?? 'viewer'} />
    </div>
  )
}

function MembersSection({ workspaceId, userRole }: { workspaceId: string; userRole: string }) {
  const [members, setMembers] = useState<Array<{
    user_id: string
    role: string
    joined_at: string
    users: { email: string; full_name: string | null } | null
  }>>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  const canInvite = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    fetch('/api/workspace/members')
      .then((r) => r.ok ? r.json() : [])
      .then(setMembers)
      .catch(() => {})
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setInviting(true)
    setInviteError(null)

    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    })

    if (res.ok) {
      setEmail('')
      setInviteSuccess(true)
      setTimeout(() => setInviteSuccess(false), 3000)
      // Reload members
      const updated = await fetch('/api/workspace/members')
      if (updated.ok) setMembers(await updated.json())
    } else {
      const data = await res.json()
      setInviteError(data.error ?? 'Failed to add member')
    }
    setInviting(false)
  }

  function timeAgo(dateStr: string): string {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
    if (days === 0) return 'Today'
    if (days < 30) return `${days}d ago`
    return `${Math.floor(days / 30)}mo ago`
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
      <h2 className="text-sm font-medium text-zinc-900">Team members</h2>

      {/* Member list */}
      <div className="divide-y divide-zinc-100">
        {members.map((m) => (
          <div key={m.user_id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">
                {m.users?.full_name ?? m.users?.email ?? m.user_id.slice(0, 8)}
              </p>
              <p className="text-xs text-zinc-400">{m.users?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-400">{timeAgo(m.joined_at)}</span>
              <span className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 capitalize">
                {m.role}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Invite form */}
      {canInvite && (
        <form onSubmit={handleInvite} className="space-y-3 border-t border-zinc-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Add member</p>
          <p className="text-xs text-zinc-400">
            They must already have a Clout account. Enter their email address.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !email.trim()}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors disabled:opacity-40"
            >
              {inviting ? 'Adding...' : inviteSuccess ? 'Added ✓' : 'Add'}
            </button>
          </div>
          {inviteError && <p className="text-xs text-red-600">{inviteError}</p>}
        </form>
      )}
    </div>
  )
}
