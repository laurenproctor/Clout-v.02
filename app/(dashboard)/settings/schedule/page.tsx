'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/scheduling')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setPrefs(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

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

  async function handleSave() {
    setSaving(true)
    await fetch('/api/scheduling', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-lg space-y-10">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Scheduling</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Set your publishing rhythm. Approved drafts auto-fill these windows.
        </p>
      </div>

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

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          'flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors',
          saved
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : saving
            ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
            : 'bg-zinc-900 text-white hover:bg-zinc-700'
        )}
      >
        {saved
          ? <><Check className="h-4 w-4" /> Saved</>
          : saving
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
          : <><Save className="h-4 w-4" /> Save preferences</>}
      </button>
    </div>
  )
}
