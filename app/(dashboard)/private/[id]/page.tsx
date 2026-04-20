'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Lock, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capture, PrivateEnrichment, Lens } from '@/types/domain'

export default function PrivateCaptureDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [capture, setCapture] = useState<Capture | null>(null)
  const [enrichment, setEnrichment] = useState<PrivateEnrichment | null>(null)
  const [lenses, setLenses] = useState<Lens[]>([])
  const [selectedLensId, setSelectedLensId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [captureRes, lensesRes] = await Promise.all([
        fetch(`/api/capture/${id}`),
        fetch('/api/lenses'),
      ])

      if (captureRes.ok) {
        const data: Capture = await captureRes.json()
        setCapture(data)
      }

      if (lensesRes.ok) {
        const data: Lens[] = await lensesRes.json()
        setLenses(data)
        if (data.length > 0) setSelectedLensId(data[0].id)
      }

      // Load enrichment if exists
      const enrichmentRes = await fetch(`/api/private/${id}/enrichment`)
      if (enrichmentRes.ok) setEnrichment(await enrichmentRes.json())

      setLoading(false)
    }
    load()
  }, [id])

  async function handleGenerate() {
    if (!selectedLensId) return
    setGenerating(true)
    setError(null)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: id, lens_id: selectedLensId }),
      })
      const data = await res.json()
      if (res.ok) {
        router.push(`/studio/${data.output_id}`)
      } else {
        setError(data.error ?? 'Generation failed')
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="h-6 w-40 rounded bg-zinc-200 animate-pulse" />
        <div className="h-48 rounded-lg border border-zinc-200 bg-white animate-pulse" />
      </div>
    )
  }

  if (!capture) {
    return (
      <div className="mx-auto max-w-3xl">
        <p className="text-sm text-zinc-500">Capture not found.</p>
        <Link href="/private" className="mt-2 text-sm text-zinc-900 underline">Back to Private Feed</Link>
      </div>
    )
  }

  const rawContent = capture.transcript ?? capture.rawContent ?? ''

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/private" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-zinc-400" />
          <h1 className="text-xl font-semibold text-zinc-900">Private thought</h1>
        </div>
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

      <div className="grid grid-cols-2 gap-4">
        {/* Raw content */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">Raw thought</p>
          <p className="text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed">
            {rawContent || <span className="text-zinc-400 italic">No content.</span>}
          </p>
        </div>

        {/* Enrichment */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">✦ Enriched</p>
          {enrichment ? (
            <div className="space-y-3">
              <p className="text-sm text-zinc-900 leading-relaxed">{enrichment.content}</p>
              {enrichment.insights.length > 0 && (
                <div className="space-y-2 border-t border-zinc-100 pt-3">
                  {enrichment.insights.map((insight, i) => (
                    <div key={i}>
                      <p className="text-xs font-medium text-zinc-700">{insight.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{insight.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400 italic">
              Enrichment pending — the AI will surface the insight shortly.
            </p>
          )}
        </div>
      </div>

      {/* Generate publishable content */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-sm font-medium text-zinc-900">Turn this into publishable content</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Apply a lens to generate a LinkedIn post, newsletter, or thread from this private thought.
          </p>
        </div>

        {lenses.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No lenses available.{' '}
            <Link href="/lenses" className="underline">Create a lens</Link> first.
          </p>
        ) : (
          <div className="space-y-3">
            <select
              className="w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={selectedLensId}
              onChange={(e) => setSelectedLensId(e.target.value)}
            >
              {lenses.map((lens) => (
                <option key={lens.id} value={lens.id}>
                  {lens.name}{lens.scope === 'system' ? ' ✦' : ''}
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerate}
              disabled={generating || !rawContent.trim()}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-5 py-2 text-sm font-medium transition-colors',
                generating || !rawContent.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              {generating ? 'Generating...' : 'Generate content →'}
            </button>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
