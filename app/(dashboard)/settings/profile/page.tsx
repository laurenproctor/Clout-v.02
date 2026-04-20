'use client'

import { useEffect, useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  display_name: string | null
  bio: string | null
  tone_notes: string | null
  industries: string[]
  target_audiences: string[]
  private_feed_operator_visible: boolean
}

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string
  values: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  function add(v: string) {
    const tag = v.trim().toLowerCase()
    if (tag && !values.includes(tag)) onChange([...values, tag])
    setInput('')
  }

  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</label>
      <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 min-h-[42px]">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="ml-0.5 text-zinc-400 hover:text-zinc-700">×</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) } }}
          onBlur={() => input.trim() && add(input)}
        />
      </div>
    </div>
  )
}

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<Profile>({
    display_name: '',
    bio: '',
    tone_notes: '',
    industries: [],
    target_audiences: [],
    private_feed_operator_visible: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data) setProfile({
          display_name: data.display_name ?? '',
          bio: data.bio ?? '',
          tone_notes: data.tone_notes ?? '',
          industries: data.industries ?? [],
          target_audiences: data.target_audiences ?? [],
          private_feed_operator_visible: data.private_feed_operator_visible ?? false,
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: profile.display_name || null,
        bio: profile.bio || null,
        tone_notes: profile.tone_notes || null,
        industries: profile.industries,
        target_audiences: profile.target_audiences,
        private_feed_operator_visible: profile.private_feed_operator_visible,
      }),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Save failed')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-6 w-40 rounded bg-zinc-200 animate-pulse" />
        <div className="h-64 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500">Your thought leader identity — the context behind your content.</p>
      </div>

      {/* Identity */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">Identity</h2>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Display name</label>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            placeholder="Your name"
            value={profile.display_name ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Bio</label>
          <textarea
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none"
            rows={3}
            placeholder="What do you stand for?"
            value={profile.bio ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">Tone notes</label>
          <p className="text-xs text-zinc-400 mt-0.5 mb-1.5">How should Clout sound when writing in your voice?</p>
          <textarea
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none"
            rows={2}
            placeholder="Direct but warm. Never uses jargon. Confident without being arrogant."
            value={profile.tone_notes ?? ''}
            onChange={(e) => setProfile((p) => ({ ...p, tone_notes: e.target.value }))}
          />
        </div>
        <TagInput
          label="Industries"
          values={profile.industries}
          onChange={(v) => setProfile((p) => ({ ...p, industries: v }))}
          placeholder="SaaS, fintech, healthcare..."
        />
        <TagInput
          label="Target audiences"
          values={profile.target_audiences}
          onChange={(v) => setProfile((p) => ({ ...p, target_audiences: v }))}
          placeholder="Founders, CTOs, investors..."
        />
      </div>

      {/* Private feed */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-900">Private Feed</h2>
        </div>
        <p className="text-sm text-zinc-500">Control whether your assigned operator can see your Private feed.</p>
        <div className="space-y-3">
          {[
            { value: false, label: 'Keep it private', description: 'Only you can see your Private feed.' },
            { value: true, label: 'Allow operator access', description: 'Your assigned operator can see your Private feed.' },
          ].map(({ value, label, description }) => (
            <button
              key={String(value)}
              type="button"
              onClick={() => setProfile((p) => ({ ...p, private_feed_operator_visible: value }))}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors',
                profile.private_feed_operator_visible === value ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                  profile.private_feed_operator_visible === value ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
                )} />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'rounded-md px-5 py-2 text-sm font-medium transition-colors',
            saving ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-700'
          )}
        >
          {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}
