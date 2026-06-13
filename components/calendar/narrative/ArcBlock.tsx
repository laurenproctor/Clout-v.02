'use client'

import type { NarrativeArc } from '@/types/calendar'
import { FunnelProgress } from './FunnelProgress'
import { ConceptCard } from '@/components/calendar/grid/ConceptCard'
import { cn } from '@/lib/utils'

interface ArcBlockProps {
  arc: NarrativeArc
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function ArcBlock({ arc, selectedConceptId, onSelectConcept }: ArcBlockProps) {
  return (
    <div className="mb-5">
      {/* Arc header */}
      <div className="bg-white border border-zinc-200 rounded-t-xl px-4 py-3 flex gap-4 items-start shadow-sm">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">
            {arc.standalone ? 'Unassigned' : 'Strategic Arc'}
          </p>
          <p className="text-[16px] font-black text-zinc-900 tracking-tight leading-tight mb-1">
            {arc.arcName}
          </p>
          {arc.arcDescription && (
            <p className="text-[11px] text-zinc-500 leading-relaxed mb-2">
              {arc.arcDescription}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {!arc.standalone && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                Active
              </span>
            )}
            {arc.resonance && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                Resonance: {arc.resonance}
              </span>
            )}
            {arc.stage && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-zinc-50 text-zinc-500 border-zinc-200">
                {arc.stage}
              </span>
            )}
            {arc.platforms.length > 0 && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border bg-zinc-50 text-zinc-500 border-zinc-200">
                {arc.platforms.slice(0, 3).join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-[13px] font-black text-zinc-800">{arc.totalConcepts}</p>
            <p className="text-[9px] uppercase tracking-wide text-zinc-400">Concepts</p>
          </div>
          <div className="text-center">
            <p className="text-[13px] font-black text-zinc-800">{arc.totalPosts}</p>
            <p className="text-[9px] uppercase tracking-wide text-zinc-400">Posts</p>
          </div>
          {!arc.standalone && (
            <div className="text-center">
              <p className="text-[13px] font-black text-zinc-800">Wk {arc.weeksRunning}</p>
              <p className="text-[9px] uppercase tracking-wide text-zinc-400">Running</p>
            </div>
          )}
        </div>
      </div>

      {/* Funnel progress */}
      {arc.funnelSteps.length > 0 && <FunnelProgress steps={arc.funnelSteps} />}

      {/* Concept cards */}
      <div className="border border-t-0 border-zinc-200 rounded-b-xl bg-zinc-50 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto [scrollbar-width:none] pb-1">
          {arc.concepts.map((concept) => (
            <div key={concept.conceptId} className="flex-shrink-0 w-[220px]">
              <ConceptCard
                concept={concept}
                isSelected={selectedConceptId === concept.conceptId}
                onSelect={() => onSelectConcept(concept.conceptId)}
              />
            </div>
          ))}
          {!arc.standalone && (
            <div className="flex-shrink-0 w-[140px] min-h-[80px] border border-dashed border-zinc-300 rounded-xl flex items-center justify-center text-[11px] font-semibold text-zinc-400 cursor-pointer hover:border-zinc-400 hover:text-zinc-500 transition-colors">
              + Add to arc
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
