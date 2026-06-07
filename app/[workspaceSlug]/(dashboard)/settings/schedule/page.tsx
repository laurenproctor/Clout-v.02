'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

const WEEKDAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 7 },
]

const TIME_OPTIONS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
]

function formatTime(t: string): string {
  const [hh, mm] = t.split(':').map(Number)
  const period = hh < 12 ? 'am' : 'pm'
  const h = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh
  return `${h}:${String(mm).padStart(2, '0')}${period}`
}

interface Prefs {
  postsPerWeek: number
  preferredDays: number[]
  preferredTimes: string[]
  timezone: string
}

const DEFAULT: Prefs = {
  postsPerWeek: 3,
  preferredDays: [1, 3, 5],
  preferredTimes: ['09:00', '12:00', '17:00'],
  timezone: 'America/New_York',
}

export default function SchedulePage() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<SaveStatus>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)

  const loaded = useRef(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveData = useRef(prefs)
  useEffect(() => { saveData.current = prefs })

  useEffect(() => {
    fetch('/api/scheduling')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPrefs(d) })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        setTimeout(() => { loaded.current = true }, 0)
      })
  }, [])

  const handleSave = useCallback(async () => {
    setStatus('saving')
    setSaveError(null)
    try {
      const res = await fetch('/api/scheduling', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveData.current),
      })
      if (res.ok) {
        setStatus('saved')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setSaveError('Save failed')
        setStatus('error')
      }
    } catch {
      setSaveError('Save failed')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!loaded.current) return
    setStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(handleSave, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [prefs, handleSave])

  function toggleDay(v: number) {
    setPrefs((p) => ({
      ...p,
      preferredDays: p.preferredDays.includes(v)
        ? p.preferredDays.filter((d) => d !== v)
        : [...p.preferredDays, v].sort((a, b) => a - b),
    }))
  }

  function toggleTime(t: string) {
    setPrefs((p) => ({
      ...p,
      preferredTimes: p.preferredTimes.includes(t)
        ? p.preferredTimes.filter((x) => x !== t)
        : [...p.preferredTimes, t].sort(),
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg pb-16">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-zinc-100 -mx-4 px-4 sm:-mx-5 sm:px-5 md:-mx-6 md:px-6 mb-6">
        <div className="flex items-center justify-between py-3">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Scheduling</h1>
            <p className="text-xs text-zinc-400">Approved drafts auto-fill these windows.</p>
          </div>
          <div className="flex items-center gap-3">
            {(status === 'unsaved' || status === 'error') && (
              <span className={cn('flex items-center gap-1.5 text-xs', {
                'text-amber-500': status === 'unsaved',
                'text-red-500': status === 'error',
              })}>
                {status === 'unsaved' && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />}
                {status === 'unsaved' ? 'Unsaved changes' : (saveError ?? 'Save failed')}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={status === 'saving' || status === 'saved'}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white transition-all',
                status === 'saved'
                  ? 'bg-emerald-600 cursor-default'
                  : status === 'saving'
                    ? 'bg-zinc-900 opacity-50 cursor-not-allowed'
                    : 'bg-zinc-900 hover:bg-zinc-700'
              )}
            >
              {status === 'saved' && <Check className="h-3 w-3" />}
              {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
              {status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Posts per week */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">Posts per week</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setPrefs((p) => ({ ...p, postsPerWeek: n }))}
                className={cn(
                  'h-10 w-12 rounded-lg border text-sm font-medium transition-colors',
                  prefs.postsPerWeek === n
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Preferred days */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">Preferred days</p>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => toggleDay(value)}
                className={cn(
                  'h-10 w-12 rounded-lg border text-sm font-medium transition-colors',
                  prefs.preferredDays.includes(value)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Preferred times */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">Preferred times</p>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTime(t)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  prefs.preferredTimes.includes(t)
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
                )}
              >
                {formatTime(t)}
              </button>
            ))}
          </div>
        </section>

        {/* Timezone */}
        <section className="space-y-3">
          <p className="text-sm font-medium text-zinc-900">Timezone</p>
          <select
            value={prefs.timezone}
            onChange={(e) => setPrefs((p) => ({ ...p, timezone: e.target.value }))}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </section>
      </div>
    </div>
  )
}
