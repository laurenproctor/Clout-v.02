'use client'

import { useEffect, useState } from 'react'
import { useWorkspace } from '@/components/providers/workspace-provider'

type Member = {
  userId: string
  fullName: string | null
  email: string
  role: string
  joinedAt: string
}

// Invites are returned in snake_case directly from Supabase via the team API
type Invite = {
  id: string
  email: string
  role: string
  created_at: string
  expires_at: string
}

const INVITABLE_ROLES = ['admin', 'editor', 'viewer'] as const

export default function TeamPage() {
  const workspace = useWorkspace()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'editor' | 'viewer'>('editor')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const canManage = workspace.userRole === 'owner' || workspace.userRole === 'admin'

  function load() {
    fetch('/api/workspace/team')
      .then(r => r.ok ? r.json() : { members: [], invites: [] })
      .then(d => {
        setMembers(d.members ?? [])
        setInvites(d.invites ?? [])
        setLoading(false)
      })
  }

  useEffect(() => { load() }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviting(true)
    setInviteError(null)
    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    })
    if (res.ok) {
      setInviteEmail('')
      load()
    } else {
      const d = await res.json()
      setInviteError(d.error ?? 'Failed to send invite')
    }
    setInviting(false)
  }

  async function handleRoleChange(userId: string, role: string) {
    await fetch(`/api/workspace/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    load()
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this member?')) return
    await fetch(`/api/workspace/members/${userId}`, { method: 'DELETE' })
    load()
  }

  async function handleRevoke(inviteId: string) {
    await fetch(`/api/workspace/invite?id=${inviteId}`, { method: 'DELETE' })
    load()
  }

  if (loading) {
    return <div className="h-48 rounded-lg border border-zinc-200 bg-zinc-50 animate-pulse" />
  }

  return (
    <div className="space-y-8 max-w-2xl">
      {canManage && (
        <section className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-zinc-900 mb-4">Invite member</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="name@company.com"
              required
              className="flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
            >
              {INVITABLE_ROLES.map(r => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={inviting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              Send invite
            </button>
          </form>
          {inviteError && <p className="mt-2 text-xs text-red-600">{inviteError}</p>}
        </section>
      )}

      <section className="rounded-lg border border-zinc-200 bg-white">
        <div className="px-6 py-4 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-900">
            Members <span className="text-zinc-400 font-normal ml-1">({members.length})</span>
          </h2>
        </div>
        <div className="divide-y divide-zinc-100">
          {members.map(m => (
            <div key={m.userId} className="flex items-center gap-3 px-6 py-3">
              <div className="h-7 w-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-medium text-zinc-600 shrink-0">
                {(m.fullName ?? m.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{m.fullName ?? m.email}</p>
                <p className="text-xs text-zinc-400 truncate">{m.email}</p>
              </div>
              {workspace.userRole === 'owner' && m.role !== 'owner' ? (
                <select
                  value={m.role}
                  onChange={e => handleRoleChange(m.userId, e.target.value)}
                  className="rounded border border-zinc-200 px-2 py-1 text-xs focus:outline-none"
                >
                  {['admin', 'editor', 'viewer'].map(r => (
                    <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 capitalize">
                  {m.role}
                </span>
              )}
              {canManage && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.userId)}
                  className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {invites.length > 0 && (
        <section className="rounded-lg border border-zinc-200 bg-white">
          <div className="px-6 py-4 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">Pending invites</h2>
          </div>
          <div className="divide-y divide-zinc-100">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-6 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-700 truncate">{inv.email}</p>
                  <p className="text-xs text-zinc-400">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="text-xs text-zinc-400 hover:text-red-600 transition-colors"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
