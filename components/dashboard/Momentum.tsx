'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2 } from 'lucide-react'
import type { PerformanceSummary } from '@/types/domain'

function formatHour(hour: number): string {
  const dt = new Date()
  dt.setHours(hour, 0, 0, 0)
  return dt.toLocaleTimeString([], { hour: 'numeric', hour12: true })
}

export function Momentum() {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)

  useEffect(() => {
    fetch('/api/performance/summary')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => setSummary(d))
      .catch(() => {})
  }, [])

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-zinc-400" />
        <h2 className="text-sm font-medium text-zinc-900">Momentum</h2>
      </div>

      {!summary ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-zinc-300" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
            <span className="text-zinc-500">Published (30d)</span>
            <span className="font-medium text-zinc-900">{summary.publishedLast30Days}</span>
          </div>
          {summary.topPostingDay && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span className="text-zinc-500">Top posting day</span>
              <span className="font-medium text-zinc-900">{summary.topPostingDay}</span>
            </div>
          )}
          {summary.topPostingHour !== null && (
            <div className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
              <span className="text-zinc-500">Top posting time</span>
              <span className="font-medium text-zinc-900">{formatHour(summary.topPostingHour)}</span>
            </div>
          )}
          {summary.publishedLast30Days === 0 && (
            <p className="px-3 text-xs text-zinc-400">Publish your first post to see momentum data.</p>
          )}
        </div>
      )}
    </div>
  )
}
