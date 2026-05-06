'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { FrameworkOutput, FrameworkCandidate } from '@/lib/lenses/framework/frameworkTypes'

interface FrameworkPreviewPanelProps {
  output: FrameworkOutput
}

const TYPE_LABELS: Record<string, string> = {
  ladder: 'Ladder',
  spectrum: 'Spectrum',
  flywheel: 'Flywheel',
  pyramid: 'Pyramid',
  matrix: 'Matrix',
  loop: 'Loop',
  stack: 'Stack',
  progression: 'Progression',
  system: 'System',
  operating_model: 'Operating Model',
  lifecycle: 'Lifecycle',
  hierarchy: 'Hierarchy',
  ecosystem: 'Ecosystem',
}

function CandidateView({ candidate }: { candidate: FrameworkCandidate }) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Framework</p>
          <h2 className="text-xl font-bold text-zinc-900 leading-tight">{candidate.frameworkName}</h2>
          <p className="text-xs text-zinc-400">{TYPE_LABELS[candidate.frameworkType] ?? candidate.frameworkType}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Score</p>
          <p className="text-lg font-bold text-zinc-700">{candidate.score}</p>
        </div>
      </div>

      {/* Nodes */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Structure</p>
        <div className="space-y-1">
          {candidate.nodes.map((node) => (
            <div key={node.id} className="flex items-start gap-2.5 border-l-2 border-zinc-200 pl-3 py-0.5">
              <div>
                <p className="text-sm font-medium text-zinc-800 leading-snug">{node.title}</p>
                {node.description && (
                  <p className="text-xs text-zinc-400 leading-snug mt-0.5">{node.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core tension */}
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-medium">Core Tension</p>
        <p className="text-sm text-zinc-600 leading-relaxed">{candidate.coreTension}</p>
      </div>

      {/* Quote */}
      {candidate.quote && (
        <div className="border-l-2 border-zinc-900 pl-3">
          <p className="text-sm text-zinc-700 italic leading-relaxed">&ldquo;{candidate.quote}&rdquo;</p>
        </div>
      )}

      {/* Intellectual territory */}
      {candidate.intellectualTerritory && candidate.intellectualTerritory.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {candidate.intellectualTerritory.map((tag) => (
            <span
              key={tag}
              className="text-[11px] font-medium text-zinc-500 bg-zinc-100 rounded-full px-2.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function FrameworkPreviewPanel({ output }: FrameworkPreviewPanelProps) {
  const [active, setActive] = useState<FrameworkCandidate>(output.top)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const allCandidates = [output.top, ...output.alternates]

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Main candidate view */}
      <div className="p-5">
        <CandidateView candidate={active} />
      </div>

      {/* Alternates dropdown */}
      {output.alternates.length > 0 && (
        <div className="border-t border-zinc-100">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-xs text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            <span className="font-medium">
              {active === output.top ? 'View alternates' : 'Switch framework'}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="border-t border-zinc-100 divide-y divide-zinc-50">
              {allCandidates.map((candidate) => (
                <button
                  key={candidate.frameworkName}
                  onClick={() => {
                    setActive(candidate)
                    setDropdownOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-5 py-3 text-left hover:bg-zinc-50 transition-colors ${
                    active === candidate ? 'bg-zinc-50' : ''
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{candidate.frameworkName}</p>
                    <p className="text-[11px] text-zinc-400">{TYPE_LABELS[candidate.frameworkType] ?? candidate.frameworkType}</p>
                  </div>
                  <span className="text-xs text-zinc-400 shrink-0 ml-3">{candidate.score}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
