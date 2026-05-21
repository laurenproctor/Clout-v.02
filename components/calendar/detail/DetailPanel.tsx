'use client'

import { PlatformPostRow } from './PlatformPostRow'
import type { CalendarConcept, NarrativeGoal } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface DetailPanelProps {
  concept: CalendarConcept | null
}

const GOAL_TEXT_CLASS: Record<NarrativeGoal, string> = {
  authority: 'text-[var(--goal-authority-text)]',
  conversation: 'text-[var(--goal-conversation-text)]',
  leads: 'text-[var(--goal-leads-text)]',
  loyalty: 'text-[var(--goal-loyalty-text)]',
  education: 'text-[var(--goal-education-text)]',
  subscribers: 'text-[var(--goal-subscribers-text)]',
  positioning: 'text-[var(--goal-positioning-text)]',
  retention: 'text-[var(--goal-retention-text)]',
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-300 mb-2">
      {children}
    </p>
  )
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p className="text-[11px] font-semibold text-zinc-700">{value}</p>
    </div>
  )
}

export function DetailPanel({ concept }: DetailPanelProps) {
  if (!concept) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
        <span className="text-2xl text-zinc-200">⬡</span>
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Select a concept to see all platform posts and strategic context
        </p>
      </div>
    )
  }

  const goalTextClass = concept.goal ? GOAL_TEXT_CLASS[concept.goal] : 'text-zinc-500'
  const totalPosts = concept.posts.length

  return (
    <div className="p-4 flex flex-col gap-0 overflow-y-auto">
      {/* Concept */}
      <div className="mb-4">
        <SectionLabel>Concept</SectionLabel>
        <p className="text-[14px] font-black text-zinc-900 leading-snug tracking-tight mb-3">
          {concept.headline}
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          {concept.goal && (
            <div>
              <p className="text-[9px] uppercase tracking-wide text-zinc-400 mb-0.5">Goal</p>
              <p className={cn('text-[11px] font-bold capitalize', goalTextClass)}>
                {concept.goal}
              </p>
            </div>
          )}
          {concept.narrativeRole && (
            <MetaRow
              label="Role"
              value={concept.narrativeRole.charAt(0).toUpperCase() + concept.narrativeRole.slice(1)}
            />
          )}
          {concept.funnelStage && (
            <MetaRow
              label="Funnel Stage"
              value={concept.funnelStage.charAt(0).toUpperCase() + concept.funnelStage.slice(1)}
            />
          )}
          {concept.resonancePrediction && (
            <MetaRow
              label="Resonance"
              value={concept.resonancePrediction.charAt(0).toUpperCase() + concept.resonancePrediction.slice(1)}
            />
          )}
        </div>
      </div>

      <hr className="border-zinc-100 mb-4" />

      {/* Platform posts */}
      <div className="mb-4">
        <SectionLabel>
          Platform Posts — {totalPosts} {totalPosts === 1 ? 'post' : 'posts'}
        </SectionLabel>
        <div className="flex flex-col gap-1.5">
          {concept.posts.map((post) => (
            <PlatformPostRow key={post.id} post={post} />
          ))}
        </div>
      </div>

      <hr className="border-zinc-100 mb-4" />

      {/* Arc */}
      {concept.narrativeArcName && (
        <>
          <div className="mb-4">
            <SectionLabel>Narrative Arc</SectionLabel>
            <p className="text-[12px] font-bold text-zinc-800">
              {concept.narrativeArcName}
            </p>
          </div>
          <hr className="border-zinc-100 mb-4" />
        </>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-zinc-900 text-white border border-zinc-900 cursor-pointer hover:bg-zinc-700 transition-colors">
          Publish All →
        </button>
        <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-white text-zinc-600 border border-zinc-200 cursor-pointer hover:bg-zinc-50 transition-colors">
          Edit Concept
        </button>
      </div>
    </div>
  )
}
