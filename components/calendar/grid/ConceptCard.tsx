'use client'

import { cn } from '@/lib/utils'
import type { CalendarConcept, NarrativeGoal, NarrativeRole } from '@/types/calendar'
import { PlatformVariantStrip } from './PlatformVariantStrip'

interface ConceptCardProps {
  concept: CalendarConcept
  isSelected: boolean
  onSelect: () => void
  showCausalArrow?: boolean
}

const GOAL_STYLES: Record<
  NarrativeGoal,
  { card: string; badge: string }
> = {
  authority:    { card: 'bg-[var(--goal-authority-bg)] border-[var(--goal-authority-border)] border-l-[var(--goal-authority-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-authority-bg)_80%,white)] text-[var(--goal-authority-text)]' },
  conversation: { card: 'bg-[var(--goal-conversation-bg)] border-[var(--goal-conversation-border)] border-l-[var(--goal-conversation-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-conversation-bg)_80%,white)] text-[var(--goal-conversation-text)]' },
  leads:        { card: 'bg-[var(--goal-leads-bg)] border-[var(--goal-leads-border)] border-l-[var(--goal-leads-accent)]',               badge: 'bg-[color-mix(in_srgb,var(--goal-leads-bg)_80%,white)] text-[var(--goal-leads-text)]' },
  loyalty:      { card: 'bg-[var(--goal-loyalty-bg)] border-[var(--goal-loyalty-border)] border-l-[var(--goal-loyalty-accent)]',          badge: 'bg-[color-mix(in_srgb,var(--goal-loyalty-bg)_80%,white)] text-[var(--goal-loyalty-text)]' },
  education:    { card: 'bg-[var(--goal-education-bg)] border-[var(--goal-education-border)] border-l-[var(--goal-education-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-education-bg)_80%,white)] text-[var(--goal-education-text)]' },
  subscribers:  { card: 'bg-[var(--goal-subscribers-bg)] border-[var(--goal-subscribers-border)] border-l-[var(--goal-subscribers-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-subscribers-bg)_80%,white)] text-[var(--goal-subscribers-text)]' },
  positioning:  { card: 'bg-[var(--goal-positioning-bg)] border-[var(--goal-positioning-border)] border-l-[var(--goal-positioning-accent)]', badge: 'bg-[color-mix(in_srgb,var(--goal-positioning-bg)_80%,white)] text-[var(--goal-positioning-text)]' },
  retention:    { card: 'bg-[var(--goal-retention-bg)] border-[var(--goal-retention-border)] border-l-[var(--goal-retention-accent)]',    badge: 'bg-[color-mix(in_srgb,var(--goal-retention-bg)_80%,white)] text-[var(--goal-retention-text)]' },
}

const ROLE_STYLES: Record<NarrativeRole, string> = {
  contrarian: 'bg-red-50 text-red-700',
  framework:  'bg-green-50 text-green-700',
  evidence:   'bg-amber-50 text-amber-700',
  cta:        'bg-pink-50 text-pink-700',
  tension:    'bg-red-50 text-red-700',
  founder:    'bg-purple-50 text-purple-700',
}

export function ConceptCard({
  concept,
  isSelected,
  onSelect,
  showCausalArrow = false,
}: ConceptCardProps) {
  const goalStyle = concept.goal
    ? GOAL_STYLES[concept.goal]
    : { card: 'bg-white border-zinc-200', badge: 'bg-zinc-100 text-zinc-500' }

  return (
    <div className="relative">
      <div
        onClick={onSelect}
        className={cn(
          'rounded-xl p-2.5 cursor-pointer flex flex-col gap-1.5',
          'border border-l-[3px] shadow-sm transition-shadow',
          goalStyle.card,
          isSelected && 'outline outline-2 outline-offset-1 outline-indigo-500',
          'hover:shadow-md'
        )}
      >
        {/* Goal badge */}
        {concept.goal && (
          <span
            className={cn(
              'self-start text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded',
              goalStyle.badge
            )}
          >
            {concept.goal}
          </span>
        )}

        {/* Headline */}
        <p className="text-[12px] font-black text-zinc-900 leading-[1.3] tracking-tight">
          {concept.headline}
        </p>

        {/* Role + lens tags */}
        <div className="flex flex-wrap gap-1">
          {concept.narrativeRole && (
            <span
              className={cn(
                'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                ROLE_STYLES[concept.narrativeRole]
              )}
            >
              {concept.narrativeRole}
            </span>
          )}
          {concept.lensNames.map((lens) => (
            <span
              key={lens}
              className="text-[9px] text-zinc-500 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded font-medium"
            >
              #{lens}
            </span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-black/5 mx-0" />

        {/* Platform variants */}
        <PlatformVariantStrip posts={concept.posts} />
      </div>

      {/* Causality arrow */}
      {showCausalArrow && (
        <span className="absolute -right-4 top-5 text-zinc-300 text-xs pointer-events-none select-none">
          →
        </span>
      )}
    </div>
  )
}
