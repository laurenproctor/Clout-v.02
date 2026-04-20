'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { Capture, Output } from '@/types/domain'
import { cn } from '@/lib/utils'

interface Stats {
  capturesThisMonth: number
  outputsGenerated: number
  draftsAwaitingReview: number
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ capturesThisMonth: 0, outputsGenerated: 0, draftsAwaitingReview: 0 })
  const [recentOutputs, setRecentOutputs] = useState<Output[]>([])
  const [loading, setLoading] = useState(true)
  const [quickCapture, setQuickCapture] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureSuccess, setCaptureSuccess] = useState(false)
  const [profileIncomplete, setProfileIncomplete] = useState(false)

  const load = useCallback(async () => {
    const [capturesRes, allOutputsRes, draftRes] = await Promise.all([
      fetch('/api/capture?private=false&limit=200'),
      fetch('/api/outputs?limit=5'),
      fetch('/api/outputs?status=draft&limit=200'),
    ])

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    if (capturesRes.ok) {
      const captures: Capture[] = await capturesRes.json()
      const thisMonth = captures.filter((c) => c.createdAt >= monthStart).length
      setStats((prev) => ({ ...prev, capturesThisMonth: thisMonth }))
    }

    if (allOutputsRes.ok) {
      const outputs: Output[] = await allOutputsRes.json()
      setRecentOutputs(outputs)
      setStats((prev) => ({ ...prev, outputsGenerated: outputs.length }))
    }

    if (draftRes.ok) {
      const drafts: Output[] = await draftRes.json()
      setStats((prev) => ({ ...prev, draftsAwaitingReview: drafts.length }))
    }

    const profileRes = await fetch('/api/profile')
    if (profileRes.ok) {
      const profile = await profileRes.json()
      const hasBasics = profile.display_name && profile.tone_notes
      const hasContext = (profile.mental_models?.length ?? 0) > 0
      setProfileIncomplete(!hasBasics || !hasContext)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleQuickCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!quickCapture.trim()) return
    setCapturing(true)
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'text', raw_content: quickCapture }),
      })
      if (res.ok) {
        await res.json()
        setQuickCapture('')
        setCaptureSuccess(true)
        setTimeout(() => setCaptureSuccess(false), 3000)
        // Re-fetch stats
        load()
      }
    } catch {}
    setCapturing(false)
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Your thought leadership command center.</p>
        </div>
        <Link
          href="/capture/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + New Capture
        </Link>
      </div>

      {/* Quick capture */}
      <form onSubmit={handleQuickCapture} className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            className="flex-1 resize-none rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none min-h-[72px]"
            placeholder="What's on your mind? Capture it here..."
            value={quickCapture}
            onChange={(e) => setQuickCapture(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuickCapture(e as unknown as React.FormEvent)
            }}
          />
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={capturing || !quickCapture.trim()}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                capturing || !quickCapture.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : captureSuccess
                  ? 'bg-green-600 text-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {capturing ? 'Saving...' : captureSuccess ? 'Saved ✓' : '⌘↵ Capture'}
            </button>
          </div>
        </div>
      </form>

      {profileIncomplete && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-900">Complete your profile</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Add your tone notes and mental models to get better generations.
            </p>
          </div>
          <a
            href="/settings/profile"
            className="shrink-0 ml-4 rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
          >
            Complete profile →
          </a>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Captures this month', value: loading ? '—' : stats.capturesThisMonth },
          { label: 'Outputs generated', value: loading ? '—' : stats.outputsGenerated },
          { label: 'Drafts awaiting review', value: loading ? '—' : stats.draftsAwaitingReview },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent outputs */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Recent outputs</h2>
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-14 rounded-lg border border-zinc-200 bg-white animate-pulse" />
            ))}
          </div>
        ) : recentOutputs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-zinc-900">No outputs yet</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Start by capturing a raw thought. Clout will turn it into publish-ready content in under 60 seconds.
              </p>
              <Link
                href="/capture/new"
                className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Create your first capture
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {recentOutputs.map((output) => (
              <Link
                key={output.id}
                href={`/studio/${output.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                    {output.title ?? 'Untitled output'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(output.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  output.status === 'approved' ? 'bg-green-50 text-green-700' :
                  output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
                  'bg-zinc-100 text-zinc-600'
                }`}>
                  {output.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
