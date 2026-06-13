'use client'

import type { InstagramVisualFormat } from '@/lib/instagram/types'
import { Spinner } from '@/components/ui/spinner'

const FORMAT_LABELS: Record<Exclude<InstagramVisualFormat, 'let_clout_decide'>, string> = {
  educational_carousel: 'Educational Carousel',
  quote_graphic:        'Quote Graphic',
  framework:            'Framework',
  narrative_story:      'Narrative Story',
  data_insight:         'Data Insight',
}

interface StrategyPreviewPanelProps {
  loading: boolean
  recommendedFormat: Exclude<InstagramVisualFormat, 'let_clout_decide'> | null
  rationale: string | null
  onAccept: () => void
  onBack: () => void
}

export function StrategyPreviewPanel({
  loading,
  recommendedFormat,
  rationale,
  onAccept,
  onBack,
}: StrategyPreviewPanelProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-400">
        <Spinner size="lg" />
        <p className="text-sm">Analyzing your content...</p>
      </div>
    )
  }

  if (!recommendedFormat) return null

  const formatLabel = FORMAT_LABELS[recommendedFormat] ?? recommendedFormat

  return (
    <div className="flex flex-col h-full px-6 py-8">
      <div className="flex-1 flex flex-col justify-center max-w-lg">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-4">
          Recommended Format
        </p>
        <h2 className="font-[Signifier] text-2xl font-semibold text-zinc-900 mb-3">
          {formatLabel}
        </h2>
        {rationale && (
          <p className="text-sm text-zinc-500 leading-relaxed mb-8">
            {rationale}
          </p>
        )}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onAccept}
            className="bg-zinc-900 text-white rounded-md px-5 py-2.5 text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Use This Format →
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
          >
            Choose a Different Format
          </button>
        </div>
      </div>
    </div>
  )
}
