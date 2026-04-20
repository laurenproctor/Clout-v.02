'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, ArrowLeft, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CaptureSource, Lens } from '@/types/domain'
import { VoiceRecorder } from '@/components/capture/voice-recorder'

const SOURCES: { value: CaptureSource; label: string; placeholder: string }[] = [
  { value: 'text', label: 'Text', placeholder: "What's on your mind? Dump it here — raw is fine." },
  { value: 'url', label: 'URL', placeholder: 'Paste a URL to capture context from...' },
  { value: 'structured', label: 'Prompt', placeholder: 'Answer the prompt below...' },
  { value: 'voice', label: 'Voice', placeholder: 'Use the recorder below' },
]

export default function NewCapturePage() {
  const router = useRouter()
  const [source, setSource] = useState<CaptureSource>('text')
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [audioPath, setAudioPath] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Post-save state
  const [savedCaptureId, setSavedCaptureId] = useState<string | null>(null)
  const [lenses, setLenses] = useState<Lens[]>([])
  const [selectedLensId, setSelectedLensId] = useState('')
  const [generating, setGenerating] = useState(false)

  // Load lenses in background so they're ready
  useEffect(() => {
    fetch('/api/lenses')
      .then((r) => r.ok ? r.json() : [])
      .then((data: Lens[]) => {
        setLenses(data)
        if (data.length > 0) setSelectedLensId(data[0].id)
      })
      .catch(() => {})
  }, [])

  const activePlaceholder = SOURCES.find((s) => s.value === source)?.placeholder ?? ''

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags((prev) => [...prev, tag])
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (source !== 'voice' && !content.trim()) return
    if (source === 'voice' && !audioPath) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source,
          raw_content: source === 'url' || source === 'voice' ? null : content,
          source_url: source === 'url' ? content : null,
          audio_path: source === 'voice' ? audioPath : undefined,
          is_private: isPrivate,
          tags,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to save capture')
        return
      }

      const capture = await res.json()

      if (isPrivate) {
        // Private captures go straight to private feed
        router.push('/private')
        return
      }

      if (lenses.length > 0) {
        // Show inline generate prompt
        setSavedCaptureId(capture.id)
      } else {
        router.push(`/capture/${capture.id}`)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGenerate() {
    if (!savedCaptureId || !selectedLensId) return
    setGenerating(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: savedCaptureId, lens_id: selectedLensId }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/studio/${data.output_id}`)
      } else {
        // Fall back to capture detail
        router.push(`/capture/${savedCaptureId}`)
      }
    } catch {
      router.push(`/capture/${savedCaptureId}`)
    }
  }

  // Post-save: offer immediate generation
  if (savedCaptureId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Capture saved</h1>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-50">
              <span className="text-green-600 text-sm">✓</span>
            </div>
            <p className="text-sm font-medium text-zinc-900">Your thought is captured. Generate content now?</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Choose a lens
              </label>
              <select
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                value={selectedLensId}
                onChange={(e) => setSelectedLensId(e.target.value)}
              >
                {lenses.map((lens) => (
                  <option key={lens.id} value={lens.id}>
                    {lens.name}{lens.scope === 'system' ? ' ✦' : ''}
                  </option>
                ))}
              </select>
              {selectedLensId && (
                <p className="mt-1 text-xs text-zinc-400">
                  {lenses.find((l) => l.id === selectedLensId)?.description}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={generating || !selectedLensId}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-5 py-2 text-sm font-medium transition-colors',
                  generating || !selectedLensId
                    ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                    : 'bg-zinc-900 text-white hover:bg-zinc-700'
                )}
              >
                <Zap className="h-3.5 w-3.5" />
                {generating ? 'Generating...' : 'Generate →'}
              </button>
              <Link
                href={`/capture/${savedCaptureId}`}
                className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                Skip for now
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">New capture</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Source type */}
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
          {SOURCES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSource(value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                source === value ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Main input */}
        {source !== 'voice' && (
          <div className="rounded-lg border border-zinc-200 bg-white p-1">
            <textarea
              autoFocus
              className="w-full resize-none rounded-md bg-transparent px-4 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none min-h-[200px]"
              placeholder={activePlaceholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}
        {source === 'voice' && (
          <VoiceRecorder
            workspaceId="pending"
            onRecorded={(path) => { setAudioPath(path); setContent('Voice memo recorded') }}
            onError={(err) => setError(err)}
          />
        )}

        {/* Tags */}
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Life sections</p>
          <div className="flex flex-wrap items-center gap-2">
            {tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700">
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="ml-0.5 text-zinc-400 hover:text-zinc-700">×</button>
              </span>
            ))}
            <input
              className="text-sm text-zinc-700 placeholder:text-zinc-300 focus:outline-none bg-transparent min-w-[120px]"
              placeholder="work, passions, love..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput) }
              }}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
            />
          </div>
        </div>

        {/* Private toggle + submit */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsPrivate((v) => !v)}
            className={cn(
              'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
              isPrivate ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 text-zinc-600 hover:border-zinc-400'
            )}
          >
            <Lock className="h-3.5 w-3.5" />
            {isPrivate ? 'Private' : 'Keep private'}
          </button>

          <button
            type="submit"
            disabled={submitting || (source !== 'voice' ? !content.trim() : !audioPath)}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              submitting || (source !== 'voice' ? !content.trim() : !audioPath)
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {submitting ? 'Saving...' : 'Save capture →'}
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}
