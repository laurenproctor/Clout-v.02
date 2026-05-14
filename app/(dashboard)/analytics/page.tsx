'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface AnalyticsData {
  months: string[]
  capturesByMonth: Array<{ month: string; count: number }>
  outputsByMonth: Array<{ month: string; count: number }>
  statusBreakdown: Record<string, number>
  contentTypeBreakdown: Array<{ type: string; label: string; count: number }>
  totalApproved: number
  topLenses: Array<{ name: string; count: number }>
  totals: { captures: number; outputs: number }
}

type Preset = '30d' | '3mo' | '6mo' | '1yr' | 'all'

const PRESETS: Array<{ key: Preset; label: string; shortcut: string }> = [
  { key: '30d', label: '30d', shortcut: '1' },
  { key: '3mo', label: '3mo', shortcut: '2' },
  { key: '6mo', label: '6mo', shortcut: '3' },
  { key: '1yr', label: '1yr', shortcut: '4' },
  { key: 'all', label: 'All', shortcut: '5' },
]

const PRESET_BY_KEY: Record<string, Preset> = { '1': '30d', '2': '3mo', '3': '6mo', '4': '1yr', '5': 'all' }

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function presetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const to = toDateStr(now)
  if (preset === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 29)
    return { from: toDateStr(from), to }
  }
  if (preset === '3mo') {
    return { from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to }
  }
  if (preset === '6mo') {
    return { from: toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1)), to }
  }
  if (preset === '1yr') {
    return { from: toDateStr(new Date(now.getFullYear() - 1, now.getMonth(), 1)), to }
  }
  return { from: '2020-01-01', to }
}

function monthLabel(m: string, spansYears: boolean): string {
  const [year, month] = m.split('-')
  const short = new Date(Number(year), Number(month) - 1).toLocaleString('default', { month: 'short' })
  return spansYears ? `${short} '${year.slice(2)}` : short
}

function SimpleBar({ value, max, color = 'bg-zinc-900' }: { value: number; max: number; color?: string }) {
  const pct = max === 0 ? 0 : Math.max((value / max) * 100, value > 0 ? 4 : 0)
  return (
    <div className="flex flex-col items-center gap-1 w-full">
      <span className="text-xs text-zinc-400">{value || ''}</span>
      <div className="w-full rounded-t" style={{ height: 60 }}>
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
  const now = new Date()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refetching, setRefetching] = useState(false)
  const [activePreset, setActivePreset] = useState<Preset>('6mo')
  const [from, setFrom] = useState(() => toDateStr(new Date(now.getFullYear(), now.getMonth() - 5, 1)))
  const [to, setTo] = useState(() => toDateStr(now))
  const fetchRef = useRef(0)

  const fetchData = useCallback((fromStr: string, toStr: string) => {
    const id = ++fetchRef.current
    setRefetching(true)
    fetch(`/api/analytics?from=${fromStr}&to=${toStr}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (fetchRef.current !== id) return
        setData(d)
        setLoading(false)
        setRefetching(false)
      })
      .catch(() => {
        if (fetchRef.current !== id) return
        setLoading(false)
        setRefetching(false)
      })
  }, [])

  useEffect(() => {
    fetchData(from, to)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function applyPreset(preset: Preset) {
    const range = presetRange(preset)
    setFrom(range.from)
    setTo(range.to)
    setActivePreset(preset)
    fetchData(range.from, range.to)
  }

  function handleFromChange(val: string) {
    if (!val) return
    setFrom(val)
    setActivePreset(null as unknown as Preset)
    fetchData(val, to)
  }

  function handleToChange(val: string) {
    if (!val) return
    setTo(val)
    setActivePreset(null as unknown as Preset)
    fetchData(from, val)
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const preset = PRESET_BY_KEY[e.key]
      if (preset) {
        e.preventDefault()
        applyPreset(preset)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to])

  const today = toDateStr(now)

  if (loading) {
    return (
      <div className="space-y-4 p-6">
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
      <div className="space-y-4 p-6">
        <h1 className="text-xl font-semibold text-zinc-900">Analytics</h1>
        <p className="text-sm text-zinc-500">No data available yet.</p>
      </div>
    )
  }

  const spansYears = new Set(data.months.map(m => m.split('-')[0])).size > 1
  const maxCaptures = Math.max(...data.capturesByMonth.map((d) => d.count), 1)
  const maxOutputs = Math.max(...data.outputsByMonth.map((d) => d.count), 1)
  const totalStatuses = Object.values(data.statusBreakdown).reduce((a, b) => a + b, 0)
  // For many months, only label every Nth bar so labels don't crowd
  const n = data.months.length
  const labelEvery = n <= 12 ? 1 : n <= 24 ? 2 : n <= 48 ? 4 : 6

  return (
    <div className={`space-y-6 transition-opacity duration-150 ${refetching ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Header + date controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-xl font-semibold text-zinc-900">Analytics</h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Preset buttons */}
          <div className="flex items-center gap-0.5 rounded-lg border border-zinc-200 bg-white p-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  activePreset === p.key
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {p.label}
                <kbd className={`rounded border px-1 py-0.5 text-[9px] font-mono ${
                  activePreset === p.key
                    ? 'border-zinc-700 bg-zinc-800 text-zinc-400'
                    : 'border-zinc-200 bg-zinc-100 text-zinc-400'
                }`}>{p.shortcut}</kbd>
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => handleFromChange(e.target.value)}
              className="border border-zinc-200 rounded-md px-2.5 py-1 text-xs text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            <span className="text-xs text-zinc-300">–</span>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => handleToChange(e.target.value)}
              className="border border-zinc-200 rounded-md px-2.5 py-1 text-xs text-zinc-700 bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>
        </div>
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
        <div className="flex items-end gap-1">
          {data.capturesByMonth.map((d, i) => (
            <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <SimpleBar value={d.count} max={maxCaptures} color="bg-zinc-900" />
              <span className="text-xs text-zinc-400 truncate w-full text-center">
                {i % labelEvery === 0 ? monthLabel(d.month, spansYears) : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Outputs by month */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-medium text-zinc-900 mb-4">Outputs per month</h2>
        <div className="flex items-end gap-1">
          {data.outputsByMonth.map((d, i) => (
            <div key={d.month} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              <SimpleBar value={d.count} max={maxOutputs} color="bg-zinc-500" />
              <span className="text-xs text-zinc-400 truncate w-full text-center">
                {i % labelEvery === 0 ? monthLabel(d.month, spansYears) : ''}
              </span>
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

        {/* Content type breakdown */}
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <h2 className="text-sm font-medium text-zinc-900 mb-4">Content created by type</h2>
          {data.contentTypeBreakdown.length === 0 ? (
            <p className="text-sm text-zinc-400 italic">No outputs yet.</p>
          ) : (
            <div className="space-y-2.5">
              {data.contentTypeBreakdown.map(({ type, label, count }) => {
                const maxCount = data.contentTypeBreakdown[0]?.count ?? 1
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-600">{label}</span>
                      <span className="text-zinc-400">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100">
                      <div
                        className="h-1.5 rounded-full bg-zinc-900"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
  )
}
