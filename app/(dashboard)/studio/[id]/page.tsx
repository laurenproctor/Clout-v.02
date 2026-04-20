'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output, OutputContent } from '@/types/domain'

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()

  const [output, setOutput] = useState<Output | null>(null)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [channels, setChannels] = useState<Array<{id: string; platform: string; label: string | null}>>([])
  const [channelId, setChannelId] = useState<string | null | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const [res, channelsRes] = await Promise.all([
        fetch(`/api/outputs/${id}`),
        fetch('/api/channels'),
      ])
      if (res.ok) {
        const data: Output = await res.json()
        setOutput(data)
        setBody((data.content as OutputContent).body ?? '')
        setTitle(data.title ?? '')
        setChannelId(data.channelId ?? 'none')
      }
      if (channelsRes.ok) setChannels(await channelsRes.json())
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaving(true)
    setError(null)
    const content: OutputContent = { ...(output?.content ?? {}), body }
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, channel_id: channelId === 'none' ? null : channelId }),
    })
    if (res.ok) {
      const updated: Output = await res.json()
      setOutput(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Save failed')
    }
    setSaving(false)
  }

  async function handleApprove() {
    setApproving(true)
    setError(null)
    const content: OutputContent = { ...(output?.content ?? {}), body }
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, approve: true, channel_id: channelId === 'none' ? null : channelId }),
    })
    if (res.ok) {
      const updated: Output = await res.json()
      setOutput(updated)
    } else {
      const data = await res.json()
      setError(data.error ?? 'Approve failed')
    }
    setApproving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-6 w-40 rounded bg-zinc-200 animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-zinc-200 animate-pulse" />
        <div className="h-64 w-full rounded-lg bg-zinc-200 animate-pulse" />
      </div>
    )
  }

  if (!output) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">Output not found.</p>
      </div>
    )
  }

  const isApproved = output.status === 'approved'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Edit Output</h1>
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-medium',
            isApproved ? 'bg-green-50 text-green-700' :
            output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
            'bg-zinc-100 text-zinc-600'
          )}>
            {output.status}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || isApproved}
            className={cn(
              'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
              saving || isApproved
                ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
            )}
          >
            {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save draft'}
          </button>
          <button
            onClick={handleApprove}
            disabled={approving || isApproved}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              approving || isApproved
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {approving ? 'Approving...' : isApproved ? 'Approved ✓' : 'Approve'}
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Editor */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        {channels.length > 0 && (
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Channel
            </label>
            <select
              className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={channelId ?? 'none'}
              onChange={(e) => setChannelId(e.target.value)}
              disabled={isApproved}
            >
              <option value="none">No channel</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.label ?? ch.platform}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Title / Hook
          </label>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            placeholder="Opening line..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isApproved}
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Body
          </label>
          <textarea
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none min-h-[320px] resize-y leading-relaxed"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isApproved}
          />
        </div>

        {/* Hashtags */}
        {Array.isArray((output.content as OutputContent).hashtags) && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
              Hashtags
            </p>
            <div className="flex flex-wrap gap-2">
              {((output.content as OutputContent).hashtags as string[]).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-500"
                >
                  #{tag.replace(/^#/, '')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
