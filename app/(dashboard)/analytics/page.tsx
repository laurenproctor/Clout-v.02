'use client'

import { useEffect, useState } from 'react'

interface AnalyticsData {
  months: string[]
  capturesByMonth: Array<{ month: string; count: number }>
  outputsByMonth: Array<{ month: string; count: number }>
  statusBreakdown: Record<string, number>
  totalApproved: number
  topLenses: Array<{ name: string; count: number }>
  totals: { captures: number; outputs: number }
}

function MonthLabel(m: string): string {
  const [year, month] = m.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' })
}

function SimpleBar({ value, max, color = 'bg-zinc-900' }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 4 : 0)
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-zinc-400">{value}</span>
      <div className="w-8 rounded-t" style={{ height: 60 }}>
        <div
          className={`w-full rounded-t transition-all ${color}`}
          style={{ height: `${pct}%`, minHeight: value > 0 ? 3 : 0 }}
        />
      </div>
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-300',
  review: 'bg-amber-400',
  approved: 'bg-green-500',
  published: 'bg-blue-500',
  archived: 'bg-zinc-200',
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-36 rounded bg-zinc-200 animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
        <div className="h-48 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">No data available yet.</p>
      </div>
    )
  }

  const maxCaptures = Math.max(...data.capturesByMonth.map((d) => d.count), 1)
  const maxOutputs = Math.max(...data.outputsByMonth.map((d) => d.count), 1)
  const totalStatuses = Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Analytics</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Last 6 months of activity.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total captures', value: data.totals.captures },
          { label: 'Total outputs', value: data.totals.outputs },
          { label: 'Approved', value: data.totalApproved },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Captures by month */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Captures per month</h2>
        <div className="flex items-end justify-between gap-2">
          {data.capturesByMonth.map((d) => (
            <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
              <SimpleBar value={d.count} max={maxCaptures} color="bg-zinc-900" />
              <span className="text-xs text-zinc-400">{MonthLabel(d.month)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Outputs by month */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Outputs per month</h2>
        <div className="flex items-end justify-between gap-2">
          {data.outputsByMonth.map((d) => (
            <div key={d.month} className="flex flex-col items-center gap-1 flex-1">
              <SimpleBar value={d.count} max={maxOutputs} color="bg-zinc-500" />
              <span className="text-xs text-zinc-400">{MonthLabel(d.month)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Status breakdown */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">Output status breakdown</h2>
          {totalStatuses === 0 ? (
            <p className="text-sm text-zinc-400 italic">No outputs yet.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(data.statusBreakdown).map(([status, count]) => (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-zinc-600">{status}</span>
                    <span className="text-zinc-400">{count}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-100">
                    <div
                      className={`h-1.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-zinc-400'}`}
                      style={{ width: `${(count / totalStatuses) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top lenses */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">Top lenses used</h2>
          {data.topLenses.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No generations yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.topLenses.map((lens, i) => (
                <div key={lens.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-zinc-300 w-4">{i + 1}</span>
                    <span className="text-sm text-zinc-700 truncate">{lens.name}</span>
                  </div>
                  <span className="text-sm font-medium text-zinc-900 shrink-0 ml-2">{lens.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
