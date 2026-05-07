'use client'

import { cn } from '@/lib/utils'
import type { ContentAnalysis, QualitativeSignal, QualitativeRating } from '@/lib/blog/types'

interface ContentAnalysisPanelProps {
  analysis: ContentAnalysis
}

const RATING_STYLES: Record<QualitativeRating, string> = {
  strong: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-zinc-100 text-zinc-600',
  developing: 'bg-amber-50 text-amber-700',
  'needs-work': 'bg-red-50 text-red-600',
}

function QualSignal({ signal, label }: { signal: QualitativeSignal; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">{label}</span>
        <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded-full capitalize', RATING_STYLES[signal.rating])}>
          {signal.rating}
        </span>
      </div>
      <p className="text-xs text-zinc-500 leading-relaxed">{signal.explanation}</p>
    </div>
  )
}

export function ContentAnalysisPanel({ analysis }: ContentAnalysisPanelProps) {
  const { seo, editorial, distribution } = analysis

  return (
    <div className="space-y-6">
      {/* SEO Metrics */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          SEO Metrics
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricBox label="Read Time" value={`${seo.estimatedReadTime} min`} />
          <MetricBox label="Keyword Density" value={`${seo.keywordDensity}%`} />
          <MetricBox label="Title Length" value={`${seo.titleLength} chars`} />
          <MetricBox label="Meta Desc" value={`${seo.metaDescriptionLength} chars`} />
        </div>
        {seo.headingStructure.length > 0 && (
          <div className="mt-2">
            <p className="text-xs text-zinc-400">Structure: {seo.headingStructure.join(' › ')}</p>
          </div>
        )}
      </div>

      {/* Editorial */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Editorial
        </h3>
        <div className="space-y-3">
          <QualSignal signal={editorial.thesisClarity} label="Thesis Clarity" />
          <QualSignal signal={editorial.argumentCoherence} label="Argument Coherence" />
          <QualSignal signal={editorial.topicalCompleteness} label="Topical Completeness" />
          <QualSignal signal={editorial.originalitySignal} label="Originality" />
        </div>
      </div>

      {/* Distribution readiness */}
      <div>
        <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
          Distribution Readiness
        </h3>
        <div className="space-y-3">
          <QualSignal signal={distribution.linkedinReadiness} label="LinkedIn" />
          <QualSignal signal={distribution.newsletterReadiness} label="Newsletter" />
          <QualSignal signal={distribution.shareability} label="Shareability" />
        </div>
      </div>
    </div>
  )
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-sm font-semibold text-zinc-900">{value}</p>
    </div>
  )
}
