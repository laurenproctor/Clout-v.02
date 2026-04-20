'use client'

import { useEffect, useState } from 'react'
import { Radio, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Platform = 'linkedin' | 'newsletter' | 'twitter'

interface Channel {
  id: string
  platform: Platform
  label: string | null
  config: Record<string, unknown>
  is_active: boolean
  created_at: string
}

const PLATFORM_INFO: Record<Platform, { label: string; icon: string; defaultConfig: Record<string, unknown> }> = {
  linkedin: {
    label: 'LinkedIn',
    icon: 'in',
    defaultConfig: { char_limit: 3000, hashtag_count: 5, include_hook: true },
  },
  newsletter: {
    label: 'Newsletter',
    icon: '✉',
    defaultConfig: { word_limit: 800, include_subject: true, include_preview: true },
  },
  twitter: {
    label: 'X / Twitter',
    icon: '𝕏',
    defaultConfig: { char_limit: 280, thread_max: 10 },
  },
}

const ALL_PLATFORMS: Platform[] = ['linkedin', 'newsletter', 'twitter']

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState<Platform | null>(null)
  const [labelInput, setLabelInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/channels')
    if (res.ok) setChannels(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const activePlatforms = new Set(channels.map((c) => c.platform))
  const availablePlatforms = ALL_PLATFORMS.filter((p) => !activePlatforms.has(p))

  async function handleAdd(platform: Platform) {
    setCreating(true)
    setError(null)
    const info = PLATFORM_INFO[platform]
    const res = await fetch('/api/channels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        label: labelInput.trim() || info.label,
        config: info.defaultConfig,
      }),
    })
    if (res.ok) {
      const newChannel = await res.json()
      setChannels((prev) => [...prev, newChannel])
      setAdding(null)
      setLabelInput('')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Failed to add channel')
    }
    setCreating(false)
  }

  async function handleToggle(channel: Channel) {
    const res = await fetch(`/api/channels/${channel.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !channel.is_active }),
    })
    if (res.ok) {
      const updated = await res.json()
      setChannels((prev) => prev.map((c) => c.id === channel.id ? updated : c))
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/channels/${id}`, { method: 'DELETE' })
    if (res.ok) setChannels((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Channels</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Configure your publishing destinations. Publishing will be enabled in a future release.
          </p>
        </div>
      </div>

      {/* Active channels */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-16 rounded-lg border border-zinc-200 bg-white animate-pulse" />)}
        </div>
      ) : channels.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
          {channels.map((channel) => {
            const info = PLATFORM_INFO[channel.platform]
            return (
              <div key={channel.id} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-600">
                  {info.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{channel.label ?? info.label}</p>
                  <p className="text-xs text-zinc-400 capitalize">{channel.platform}</p>
                </div>
                <button
                  onClick={() => handleToggle(channel)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    channel.is_active
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                  )}
                >
                  {channel.is_active ? 'Active' : 'Inactive'}
                </button>
                <button
                  onClick={() => handleDelete(channel.id)}
                  className="text-zinc-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add channel */}
      {availablePlatforms.length > 0 && (
        <div>
          {adding ? (
            <div className="rounded-lg border border-zinc-900 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-900">
                  Add {PLATFORM_INFO[adding].label}
                </p>
                <button
                  onClick={() => { setAdding(null); setLabelInput(''); setError(null) }}
                  className="text-zinc-400 hover:text-zinc-700 text-sm"
                >
                  Cancel
                </button>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  Label (optional)
                </label>
                <input
                  autoFocus
                  className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                  placeholder={`e.g. My ${PLATFORM_INFO[adding].label}`}
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd(adding)}
                />
              </div>
              <div className="rounded-md bg-zinc-50 border border-zinc-100 px-3 py-2">
                <p className="text-xs font-medium text-zinc-400 mb-1">Default config</p>
                {Object.entries(PLATFORM_INFO[adding].defaultConfig).map(([k, v]) => (
                  <p key={k} className="text-xs text-zinc-500">
                    <span className="font-mono">{k}:</span> {String(v)}
                  </p>
                ))}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button
                onClick={() => handleAdd(adding)}
                disabled={creating}
                className={cn(
                  'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  creating ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-700'
                )}
              >
                {creating ? 'Adding...' : `Add ${PLATFORM_INFO[adding].label}`}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
                Add a channel
              </p>
              <div className="flex gap-2 flex-wrap">
                {availablePlatforms.map((platform) => {
                  const info = PLATFORM_INFO[platform]
                  return (
                    <button
                      key={platform}
                      onClick={() => setAdding(platform)}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                    >
                      <span className="text-base">{info.icon}</span>
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && channels.length === 0 && !adding && (
        <div className="rounded-lg border border-zinc-200 bg-white">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
              <Radio className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-900">No channels configured</p>
            <p className="mt-1 max-w-sm text-sm text-zinc-500">
              Add a channel below to tell Clout where your content is headed. Format-aware generation coming soon.
            </p>
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        Publishing connections (OAuth) will be added in a future release. Channels currently inform content formatting only.
      </p>
    </div>
  )
}
