'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, ExternalLink } from 'lucide-react'
import {
  type RecommendationResult,
  type RecommendedFormat,
  FORMAT_LABELS,
  FORMAT_CREATOR_ROUTE,
  RECOMMENDED_FORMATS,
} from '@/lib/create/recommendTypes'

interface RecommendedPathPanelProps {
  workspaceSlug: string
  captureId: string | null
  isPrivate?: boolean
  recommendation: RecommendationResult
  /** Return to the composer to start a new brief. */
  onReset: () => void
}

export function RecommendedPathPanel({
  workspaceSlug,
  captureId,
  isPrivate = false,
  recommendation,
  onReset,
}: RecommendedPathPanelProps) {
  const router = useRouter()
  const [format, setFormat] = useState<RecommendedFormat>(recommendation.recommendedPrimaryFormat)
  const [routing, setRouting] = useState(false)

  const briefParam = captureId ? `?briefCaptureId=${captureId}` : ''

  // Phase 1: route into the existing per-channel creator, seeded with the brief.
  // (Phase 2 swaps this for in-place generation on supported formats.)
  function handleContinue() {
    setRouting(true)
    router.push(`/${workspaceSlug}${FORMAT_CREATOR_ROUTE[format]}${briefParam}`)
  }

  function handleViewSource() {
    if (!captureId) return
    const base = isPrivate ? 'private' : 'capture'
    router.push(`/${workspaceSlug}/${base}/${captureId}`)
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">
          Recommended starting point
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Start over
        </button>
      </div>

      {/* Primary recommendation */}
      <h2 className="font-[Signifier] text-xl font-semibold text-zinc-900">
        Best starting point: {FORMAT_LABELS[recommendation.recommendedPrimaryFormat]}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">
        <span className="font-medium text-zinc-900">Why: </span>
        {recommendation.rationale}
      </p>

      {/* Suggested adaptations */}
      {recommendation.suggestedAdaptations.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Suggested adaptations
          </p>
          <div className="overflow-hidden rounded-lg border border-zinc-200">
            {recommendation.suggestedAdaptations.map((a, i) => (
              <div
                key={`${a.channel}-${i}`}
                className="flex items-baseline gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-b-0"
              >
                <span className="w-32 shrink-0 text-sm font-medium text-zinc-900">{a.channel}</span>
                <span className="text-sm text-zinc-500">{a.role}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Adaptations aren&apos;t generated yet — create the primary draft first, then adapt it in Studio.
          </p>
        </div>
      )}

      {/* Change primary format */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label htmlFor="primary-format" className="text-sm text-zinc-500">
          Change primary format
        </label>
        <select
          id="primary-format"
          value={format}
          onChange={(e) => setFormat(e.target.value as RecommendedFormat)}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
        >
          {RECOMMENDED_FORMATS.map((f) => (
            <option key={f} value={f}>
              {FORMAT_LABELS[f]}
            </option>
          ))}
        </select>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleContinue}
          disabled={routing}
          className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-60"
        >
          Continue with {FORMAT_LABELS[format].toLowerCase()}
          <ArrowRight className="h-4 w-4" />
        </button>
        {captureId && (
          <button
            type="button"
            onClick={handleViewSource}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            View source
            <ExternalLink className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
