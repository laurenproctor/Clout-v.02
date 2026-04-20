'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'

interface User {
  id: string
  email: string
  full_name: string | null
  operator_role: string | null
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export default function OperatorUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    fetch('/api/operator/users')
      .then((r) => {
        if (r.status === 403) { setForbidden(true); setLoading(false); return null }
        return r.ok ? r.json() : []
      })
      .then((data) => { if (data) { setUsers(data); setLoading(false) } })
      .catch(() => setLoading(false))
  }, [])

  if (forbidden) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
        <p className="text-sm text-zinc-500">Only super admins can view all users.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Users</h1>
        <p className="mt-0.5 text-sm text-zinc-500">All registered users.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Users className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No users yet</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="grid grid-cols-4 gap-4 border-b border-zinc-100 px-5 py-3">
            {['User', 'Email', 'Role', 'Joined'].map((h) => (
              <p key={h} className="text-xs font-medium uppercase tracking-wide text-zinc-400">{h}</p>
            ))}
          </div>
          {users.map((user) => (
            <div key={user.id} className="grid grid-cols-4 gap-4 items-center border-b border-zinc-50 px-5 py-3 last:border-0">
              <p className="text-sm font-medium text-zinc-900 truncate">
                {user.full_name ?? '—'}
              </p>
              <p className="text-sm text-zinc-500 truncate">{user.email}</p>
              <span className="text-xs">
                {user.operator_role ? (
                  <span className="rounded-full bg-zinc-900 text-white px-2 py-0.5 font-medium capitalize">
                    {user.operator_role.replace('_', ' ')}
                  </span>
                ) : (
                  <span className="text-zinc-400">User</span>
                )}
              </span>
              <p className="text-sm text-zinc-400">{timeAgo(user.created_at)}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-zinc-400">Showing up to 200 most recent users.</p>
    </div>
  )
}
