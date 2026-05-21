'use client'

import type { NarrativeArc, NarrativeHealth } from '@/types/calendar'

interface NarrativeViewProps {
  arcs: NarrativeArc[]
  health: NarrativeHealth
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function NarrativeView({ health }: NarrativeViewProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <p className="text-[13px] font-semibold text-zinc-400">
        Narrative View — Coming Soon
      </p>
      <p className="text-[11px] text-zinc-300">Narrative Health: {health.score}%</p>
    </div>
  )
}
