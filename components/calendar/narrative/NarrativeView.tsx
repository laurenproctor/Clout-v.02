'use client'

import type { NarrativeArc, NarrativeHealth } from '@/types/calendar'
import { NarrativeHealthPanel } from './NarrativeHealthPanel'
import { ArcBlock } from './ArcBlock'

interface NarrativeViewProps {
  arcs: NarrativeArc[]
  health: NarrativeHealth
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function NarrativeView({
  arcs,
  health,
  selectedConceptId,
  onSelectConcept,
}: NarrativeViewProps) {
  return (
    <div>
      <NarrativeHealthPanel health={health} />

      {arcs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <span className="text-4xl text-zinc-200">⬡</span>
          <p className="text-[13px] font-semibold text-zinc-400">
            No narrative arcs this week
          </p>
          <p className="text-[11px] text-zinc-300">
            Arcs are assigned automatically when Clout detects related content
          </p>
        </div>
      ) : (
        arcs.map((arc) => (
          <ArcBlock
            key={arc.arcId}
            arc={arc}
            selectedConceptId={selectedConceptId}
            onSelectConcept={onSelectConcept}
          />
        ))
      )}
    </div>
  )
}
