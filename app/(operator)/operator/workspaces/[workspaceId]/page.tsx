'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceDetail {
  workspace: { id: string; name: string; slug: string; plan: string }
  members: Array<{ user_id: string; role: string; joined_at: string }>
  stats: {
    capturesThisMonth: number
    totalOutputs: number
    draftsPendingReview: number
  }
  recentOutputs: Array<{
    id: string
    title: string | null
    status: string
    created_at: string
    content: { body?: string }
  }>
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function OperatorWorkspaceDetailPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const [data, setData] = useState<WorkspaceDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/operator/workspaces/${workspaceId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [workspaceId])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-48 rounded bg-zinc-200 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div>
        <p className="text-sm text-zinc-500">Workspace not found or access denied.</p>
        <Link href="/operator/workspaces" className="mt-2 text-sm text-zinc-900 underline">Back</Link>
      </div>
    )
  }

  const { workspace, stats, recentOutputs, members } = data

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/operator/workspaces" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">{workspace.name}</h1>
          <p className="text-xs text-zinc-400 font-mono">{workspace.slug} · {workspace.plan}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Captures this month', value: stats.capturesThisMonth },
          { label: 'Total outputs', value: stats.totalOutputs },
          { label: 'Drafts pending review', value: stats.draftsPendingReview },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent outputs */}
        <div className="col-span-2 rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900 mb-3">Recent outputs</h2>
          {recentOutputs.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No outputs yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOutputs.map((output) => (
                <div key={output.id} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                      {output.title ?? 'Untitled'}
                    </p>
                    <p className="text-xs text-zinc-400">{timeAgo(output.created_at)}</p>
                  </div>
                  <span className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    output.status === 'approved' ? 'bg-green-50 text-green-700' :
                    output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
                    'bg-zinc-100 text-zinc-600'
                  )}>
                    {output.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-sm font-medium text-zinc-900 mb-3">Members</h2>
          {members.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No members.</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                  <p className="text-xs text-zinc-500 font-mono truncate max-w-[100px]">{member.user_id.slice(0, 8)}…</p>
                  <span className="text-xs font-medium text-zinc-600 capitalize">{member.role}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
