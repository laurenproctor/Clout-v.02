'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Building2 } from 'lucide-react'

interface Workspace {
  id: string
  name: string
  slug: string
  plan: string
  created_at: string
  assigned_operator_id: string | null
  workspace_members: { count: number }[]
}

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', pro: 'Pro', business: 'Business', enterprise: 'Enterprise',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function OperatorWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/operator/workspaces')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { setWorkspaces(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Managed Workspaces</h1>
        <p className="mt-0.5 text-sm text-zinc-500">All workspaces you are assigned to manage.</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg border border-zinc-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Building2 className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No workspaces assigned</p>
            <p className="mt-1 text-sm text-zinc-500">Workspaces assigned to you will appear here.</p>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="grid grid-cols-5 gap-4 border-b border-zinc-100 px-5 py-3">
            {['Workspace', 'Plan', 'Members', 'Created', ''].map((h) => (
              <p key={h} className="text-xs font-medium uppercase tracking-wide text-zinc-400">{h}</p>
            ))}
          </div>
          {workspaces.map((ws) => {
            const memberCount = ws.workspace_members?.[0]?.count ?? 0
            return (
              <div
                key={ws.id}
                className="grid grid-cols-5 gap-4 items-center border-b border-zinc-50 px-5 py-3.5 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-zinc-900">{ws.name}</p>
                  <p className="text-xs text-zinc-400 font-mono">{ws.slug}</p>
                </div>
                <span className="text-sm text-zinc-600 capitalize">
                  {PLAN_LABELS[ws.plan] ?? ws.plan}
                </span>
                <span className="text-sm text-zinc-600">{memberCount}</span>
                <span className="text-sm text-zinc-400">{timeAgo(ws.created_at)}</span>
                <Link
                  href={`/operator/workspaces/${ws.id}`}
                  className="text-sm font-medium text-zinc-900 hover:underline text-right"
                >
                  View →
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
