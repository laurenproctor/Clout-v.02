'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capture, Lens } from '@/types/domain'
import { UpgradePrompt } from '@/components/shared/upgrade-prompt'

export default function CaptureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [capture, setCapture] = useState<Capture | null>(null)
  const [lenses, setLenses] = useState<Lens[]>([])
  const [selectedLensId, setSelectedLensId] = useState<string>('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<{ type: 'capture' | 'generation' } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)

  useEffect(() => {
    if (capture) setNotes(capture.notes ?? '')
  }, [capture])

  useEffect(() => {
    async function load() {
      const [captureRes, lensesRes] = await Promise.all([
        fetch(`/api/capture/${id}`),
        fetch('/api/lenses'),
      ])
      if (captureRes.ok) setCapture(await captureRes.json())
      if (lensesRes.ok) {
        const data = await lensesRes.json()
        setLenses(data)
        if (data.length > 0) setSelectedLensId(data[0].id)
      }
      setLoading(false)
    }
    load()
  }, [id])

  async function handleSaveNotes() {
    setSavingNotes(true)
    const res = await fetch(`/api/capture/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    })
    if (res.ok) {
      setNotesSaved(true)
      setTimeout(() => setNotesSaved(false), 2000)
    }
    setSavingNotes(false)
  }

  async function handleGenerate() {
    if (!selectedLensId) return
    setGenerating(true)
    setError(null)
    setLimitError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: id, lens_id: selectedLensId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code === 'GENERATION_LIMIT_EXCEEDED') {
          setLimitError({ type: 'generation' })
          return
        }
        setError(data.error ?? 'Generation failed')
        return
      }
      router.push(`/studio/${data.output_id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-6 w-48 rounded bg-zinc-200 animate-pulse" />
        <div className="h-40 w-full rounded-lg bg-zinc-200 animate-pulse" />
      </div>
    )
  }

  if (!capture) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-sm text-zinc-500">Capture not found.</p>
        <Link href="/capture" className="mt-2 text-sm text-zinc-900 underline">
          Back to captures
        </Link>
      </div>
    )
  }

  const content = capture.transcript ?? capture.rawContent ?? ''

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-xl font-semibold text-zinc-900">Capture</h1>
        {capture.isPrivate && (
          <span className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
            <Lock className="h-3 w-3" />
            Private
          </span>
        )}
      </div>

      {/* Raw content */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            {capture.source}
          </span>
          <span className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            capture.status === 'ready' ? 'bg-green-50 text-green-700' :
            capture.status === 'failed' ? 'bg-red-50 text-red-700' :
            'bg-zinc-100 text-zinc-600'
          )}>
            {capture.status}
          </span>
          {capture.tags.length > 0 && (
            <div className="flex gap-1">
              {capture.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-zinc-200 px-2 py-0.5 text-xs text-zinc-500">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <p className="whitespace-pre-wrap text-sm text-zinc-800 leading-relaxed">
          {content || <span className="text-zinc-400 italic">No content yet.</span>}
        </p>
      </div>

      {/* Notes */}
      {!loading && capture && (
        <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
          <h2 className="text-sm font-medium text-zinc-900">Notes</h2>
          <textarea
            className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none"
            rows={3}
            placeholder="Add context, reminders, or ideas about this capture..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Auto-saves on blur</p>
            {notesSaved && <p className="text-xs text-green-600">Saved ✓</p>}
            {savingNotes && <p className="text-xs text-zinc-400">Saving...</p>}
          </div>
        </div>
      )}

      {/* Generate section */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">Generate content</h2>

        {lenses.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No lenses available yet.{' '}
            <Link href="/lenses" className="underline">Create a lens</Link> to get started.
          </p>
        ) : (
          <>
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
                    {lens.name}
                    {lens.scope === 'system' ? ' ✦' : ''}
                  </option>
                ))}
              </select>
              {selectedLensId && (
                <p className="mt-1.5 text-xs text-zinc-400">
                  {lenses.find((l) => l.id === selectedLensId)?.description}
                </p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !content.trim()}
              className={cn(
                'rounded-md px-5 py-2 text-sm font-medium transition-colors',
                generating || !content.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {generating ? 'Generating...' : 'Generate →'}
            </button>

            {limitError && (
              <UpgradePrompt
                type={limitError.type}
                used={0}
                limit={20}
                onDismiss={() => setLimitError(null)}
              />
            )}
            {error && !limitError && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}
      </div>

      {/* Existing outputs for this capture */}
      <ExistingOutputs captureId={id} />
    </div>
  )
}

function ExistingOutputs({ captureId }: { captureId: string }) {
  const [outputs, setOutputs] = useState<Array<{
    id: string
    title: string | null
    status: string
    created_at: string
  }>>([])

  useEffect(() => {
    fetch(`/api/capture/${captureId}/outputs`)
      .then((r) => r.ok ? r.json() : [])
      .then(setOutputs)
      .catch(() => {})
  }, [captureId])

  if (outputs.length === 0) return null

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-3">
      <h2 className="text-sm font-medium text-zinc-900">Existing outputs</h2>
      <div className="space-y-2">
        {outputs.map((output) => (
          <Link
            key={output.id}
            href={`/studio/${output.id}`}
            className="flex items-center justify-between rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 hover:bg-zinc-100 transition-colors"
          >
            <span className="text-sm text-zinc-800 truncate">
              {output.title ?? 'Untitled output'}
            </span>
            <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              output.status === 'approved' ? 'bg-green-50 text-green-700' :
              output.status === 'review' ? 'bg-yellow-50 text-yellow-700' :
              'bg-zinc-100 text-zinc-600'
            }`}>
              {output.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
