'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Output, OutputContent } from '@/types/domain'

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [output, setOutput] = useState<Output | null>(null)
  const [body, setBody] = useState('')
  const [title, setTitle] = useState('')
  const [channels, setChannels] = useState<Array<{id: string; platform: string; label: string | null}>>([])
  const [channelId, setChannelId] = useState<string | null | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [approving, setApproving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRegenerate, setShowRegenerate] = useState(false)
  const [lenses, setLenses] = useState<Array<{id: string; name: string; description: string | null; scope: string}>>([])
  const [regenLensId, setRegenLensId] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [sendingReview, setSendingReview] = useState(false)
  const [hashtags, setHashtags] = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showExport, setShowExport] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        setHashtags(((data.content as OutputContent).hashtags as string[] ?? []).map((h) => h.replace(/^#/, '')))
      }
      if (channelsRes.ok) setChannels(await channelsRes.json())
      const lensesRes = await fetch('/api/lenses')
      if (lensesRes.ok) {
        const data = await lensesRes.json()
        setLenses(data)
        if (data.length > 0) setRegenLensId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [id])

  useEffect(() => {
    if (!output || output.status === 'approved') return
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current)

    autoSaveRef.current = setTimeout(async () => {
      setAutoSaving(true)
      const content: OutputContent = { ...(output.content ?? {}), body, hashtags }
      const res = await fetch(`/api/outputs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, title }),
      })
      if (res.ok) {
        const updated: Output = await res.json()
        setOutput(updated)
        setLastSaved(new Date())
      }
      setAutoSaving(false)
    }, 2000)

    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current) }
  }, [body, title, hashtags]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!showExport) return
    function handleClickOutside() { setShowExport(false) }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showExport])

  async function handleDelete() {
    if (!confirm('Delete this output? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/outputs/${id}`, { method: 'DELETE' })
    if (res.ok) {
      router.push('/studio')
    }
    setDeleting(false)
  }

  async function handleRegenerate() {
    if (!output || !regenLensId) return
    setRegenerating(true)

    // Get the capture_id from the generation
    const genRes = await fetch(`/api/generate/context?generation_id=${output.generationId}`)
    if (!genRes.ok) {
      // Fallback: just go to capture page if we can't find generation
      setRegenerating(false)
      setShowRegenerate(false)
      return
    }
    const { capture_id } = await genRes.json()

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capture_id, lens_id: regenLensId }),
    })

    if (res.ok) {
      const data = await res.json()
      router.push(`/studio/${data.output_id}`)
    }
    setRegenerating(false)
  }

  async function handleSendForReview() {
    setSendingReview(true)
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' }),
    })
    if (res.ok) {
      const updated: Output = await res.json()
      setOutput(updated)
    }
    setSendingReview(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const content: OutputContent = { ...(output?.content ?? {}), body, hashtags }
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
    const content: OutputContent = { ...(output?.content ?? {}), body, hashtags }
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

  async function handleCopy() {
    const text = [title, body].filter(Boolean).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function exportAs(format: 'markdown' | 'plain' | 'linkedin') {
    let text = ''
    const content = output?.content as OutputContent
    const hashtags = (content?.hashtags as string[] ?? []).map((h) => `#${h.replace(/^#/, '')}`).join(' ')

    if (format === 'markdown') {
      text = [
        title ? `# ${title}` : '',
        '',
        body,
        hashtags ? `\n${hashtags}` : '',
      ].filter((l) => l !== undefined).join('\n').trim()
    } else if (format === 'linkedin') {
      text = [title, '', body, hashtags ? `\n${hashtags}` : ''].filter(Boolean).join('\n').trim()
    } else {
      text = [title, body].filter(Boolean).join('\n\n')
    }

    navigator.clipboard.writeText(text)
    setShowExport(false)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            {autoSaving ? (
              <span>Saving...</span>
            ) : lastSaved ? (
              <span>Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            ) : null}
          </div>
          <button
            onClick={handleDelete}
            disabled={deleting || isApproved}
            className="ml-2 text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-40"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRegenerate((v) => !v)}
            disabled={isApproved}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
          >
            ↻ Regenerate
          </button>
          <div className="relative">
            <div className="flex rounded-md border border-zinc-200 overflow-hidden">
              <button
                onClick={handleCopy}
                disabled={!body}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-40"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                onClick={() => setShowExport((v) => !v)}
                disabled={!body}
                className="px-2 py-2 text-sm text-zinc-400 hover:bg-zinc-50 border-l border-zinc-200 transition-colors disabled:opacity-40"
              >
                ▾
              </button>
            </div>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 w-44 rounded-md border border-zinc-200 bg-white shadow-sm z-10">
                {[
                  { label: 'Copy as plain text', format: 'plain' as const },
                  { label: 'Copy as Markdown', format: 'markdown' as const },
                  { label: 'Copy for LinkedIn', format: 'linkedin' as const },
                ].map(({ label, format }) => (
                  <button
                    key={format}
                    onClick={() => exportAs(format)}
                    className="block w-full px-4 py-2.5 text-left text-sm text-zinc-700 hover:bg-zinc-50 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
          {output.status === 'draft' && (
            <button
              onClick={handleSendForReview}
              disabled={sendingReview}
              className={cn(
                'rounded-md border px-4 py-2 text-sm font-medium transition-colors',
                sendingReview
                  ? 'border-zinc-200 text-zinc-300 cursor-not-allowed'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              )}
            >
              {sendingReview ? 'Sending...' : 'Send for review'}
            </button>
          )}
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

      {showRegenerate && lenses.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 space-y-3">
          <p className="text-sm font-medium text-zinc-900">Generate a new version with a different lens</p>
          <select
            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            value={regenLensId}
            onChange={(e) => setRegenLensId(e.target.value)}
          >
            {lenses.map((lens) => (
              <option key={lens.id} value={lens.id}>
                {lens.name}{lens.scope === 'system' ? ' ✦' : ''}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                regenerating ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {regenerating ? 'Generating...' : 'Generate new version →'}
            </button>
            <button
              onClick={() => setShowRegenerate(false)}
              className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
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

        {/* Word/char count */}
        {body && (
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>{body.trim().split(/\s+/).filter(Boolean).length} words</span>
            <span>{body.length} characters</span>
            {body.length > 2800 && (
              <span className="text-amber-600 font-medium">
                LinkedIn limit: {3000 - body.length} remaining
              </span>
            )}
            {body.length > 250 && body.length <= 280 && (
              <span className="text-amber-600 font-medium">
                Twitter limit: {280 - body.length} remaining
              </span>
            )}
            {body.length > 280 && (
              <span className="text-red-600 font-medium">
                Over Twitter limit by {body.length - 280}
              </span>
            )}
          </div>
        )}

        {/* Hashtags */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Hashtags
          </label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 min-h-[42px]">
            {hashtags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700">
                #{tag}
                {!isApproved && (
                  <button
                    type="button"
                    onClick={() => setHashtags((prev) => prev.filter((t) => t !== tag))}
                    className="ml-0.5 text-zinc-400 hover:text-zinc-700"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {!isApproved && (
              <input
                className="flex-1 min-w-[80px] text-xs text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent"
                placeholder="Add hashtag..."
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value.replace(/^#/, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                    e.preventDefault()
                    const tag = hashtagInput.trim().replace(/^#/, '')
                    if (tag && !hashtags.includes(tag)) setHashtags((prev) => [...prev, tag])
                    setHashtagInput('')
                  }
                }}
                onBlur={() => {
                  const tag = hashtagInput.trim().replace(/^#/, '')
                  if (tag && !hashtags.includes(tag)) setHashtags((prev) => [...prev, tag])
                  setHashtagInput('')
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Version history */}
      <VersionHistory outputId={id} />
    </div>
  )
}

function VersionHistory({ outputId }: { outputId: string }) {
  const [versions, setVersions] = useState<Array<{
    id: string
    version_number: number
    content: { body?: string }
    change_summary: string | null
    created_at: string
  }>>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (loading) return
    setLoading(true)
    const res = await fetch(`/api/outputs/${outputId}/versions`)
    if (res.ok) setVersions(await res.json())
    setLoading(false)
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (!expanded) {
    return (
      <button
        onClick={() => { setExpanded(true); load() }}
        className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
      >
        View version history →
      </button>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-zinc-900">Version history</h3>
        <button onClick={() => setExpanded(false)} className="text-xs text-zinc-400 hover:text-zinc-600">
          Hide
        </button>
      </div>
      {loading ? (
        <div className="h-16 rounded bg-zinc-100 animate-pulse" />
      ) : versions.length === 0 ? (
        <p className="text-sm text-zinc-400 italic">No versions saved yet. Editing creates a snapshot.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {versions.map((v) => (
            <div key={v.id} className="py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-600">v{v.version_number}</span>
                <span className="text-xs text-zinc-400">{timeAgo(v.created_at)}</span>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2">
                {v.content?.body?.slice(0, 120) ?? '—'}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
