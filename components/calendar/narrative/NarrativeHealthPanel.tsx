import type { NarrativeHealth } from '@/types/calendar'

interface NarrativeHealthPanelProps {
  health: NarrativeHealth
}

export function NarrativeHealthPanel({ health }: NarrativeHealthPanelProps) {
  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-4 mb-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
          Narrative Health
        </span>
        <span className="text-[20px] font-black text-amber-600 tracking-tight">
          {health.score}%{' '}
          <span className="text-[11px] font-medium text-zinc-400">/ 100</span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
            Strengths
          </p>
          {health.strengths.length === 0 ? (
            <p className="text-[11px] text-zinc-300 italic">None yet</p>
          ) : (
            health.strengths.map((s, i) => (
              <p key={i} className="text-[11px] text-green-700 flex gap-1.5 leading-snug mb-1">
                <span className="flex-shrink-0">✓</span>
                {s}
              </p>
            ))
          )}
        </div>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
            Gaps
          </p>
          {health.gaps.length === 0 ? (
            <p className="text-[11px] text-zinc-300 italic">None detected</p>
          ) : (
            health.gaps.map((g, i) => (
              <p key={i} className="text-[11px] text-red-700 flex gap-1.5 leading-snug mb-1">
                <span className="flex-shrink-0">×</span>
                {g}
              </p>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
