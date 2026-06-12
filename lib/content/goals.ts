// Shared goal vocabulary for campaigns (and reusable across the app).
// `goal` is the strategic category a campaign / output serves. The 8 values
// mirror the `outputs.goal` / `campaigns.goal` CHECK constraint and the
// `NarrativeGoal` union. Goal colors come from the `--goal-*` CSS variables in
// styles/tokens.css — use the full static class strings below so Tailwind can
// see them at build time (never build goal class names dynamically).

import type { NarrativeGoal } from '@/types/calendar'

export const GOAL_VALUES = [
  'authority',
  'conversation',
  'leads',
  'loyalty',
  'education',
  'subscribers',
  'positioning',
  'retention',
] as const satisfies readonly NarrativeGoal[]

export const GOAL_LABELS: Record<NarrativeGoal, string> = {
  authority: 'Authority',
  conversation: 'Conversation',
  leads: 'Leads',
  loyalty: 'Loyalty',
  education: 'Education',
  subscribers: 'Subscribers',
  positioning: 'Positioning',
  retention: 'Retention',
}

// One-line "what this goal is for" — shown under each option in the setup form so
// the strategic choice is meaningful, not just a label.
export const GOAL_DESCRIPTIONS: Record<NarrativeGoal, string> = {
  authority: 'Build credibility and trust around a topic.',
  conversation: 'Start or join meaningful market conversations.',
  leads: 'Move qualified prospects toward a clear next step.',
  loyalty: 'Deepen relationships with existing customers or audience.',
  education: 'Teach the market how to understand a problem or solution.',
  subscribers: 'Grow an owned audience.',
  positioning: 'Clarify how the brand should be understood.',
  retention: 'Support continued use, trust, and customer success.',
}

// Full static Tailwind class strings for a goal badge/chip. Copied from the
// working `color-mix` + CSS-var strings in components/calendar/grid/ConceptCard.tsx
// (the `badge` variant), with a matching border. Do NOT construct these dynamically.
export const GOAL_BADGE: Record<NarrativeGoal, string> = {
  authority:    'bg-[color-mix(in_srgb,var(--goal-authority-bg)_80%,white)] text-[var(--goal-authority-text)] border-[var(--goal-authority-border)]',
  conversation: 'bg-[color-mix(in_srgb,var(--goal-conversation-bg)_80%,white)] text-[var(--goal-conversation-text)] border-[var(--goal-conversation-border)]',
  leads:        'bg-[color-mix(in_srgb,var(--goal-leads-bg)_80%,white)] text-[var(--goal-leads-text)] border-[var(--goal-leads-border)]',
  loyalty:      'bg-[color-mix(in_srgb,var(--goal-loyalty-bg)_80%,white)] text-[var(--goal-loyalty-text)] border-[var(--goal-loyalty-border)]',
  education:    'bg-[color-mix(in_srgb,var(--goal-education-bg)_80%,white)] text-[var(--goal-education-text)] border-[var(--goal-education-border)]',
  subscribers:  'bg-[color-mix(in_srgb,var(--goal-subscribers-bg)_80%,white)] text-[var(--goal-subscribers-text)] border-[var(--goal-subscribers-border)]',
  positioning:  'bg-[color-mix(in_srgb,var(--goal-positioning-bg)_80%,white)] text-[var(--goal-positioning-text)] border-[var(--goal-positioning-border)]',
  retention:    'bg-[color-mix(in_srgb,var(--goal-retention-bg)_80%,white)] text-[var(--goal-retention-text)] border-[var(--goal-retention-border)]',
}

export function isNarrativeGoal(value: unknown): value is NarrativeGoal {
  return typeof value === 'string' && (GOAL_VALUES as readonly string[]).includes(value)
}

export function goalLabel(goal: NarrativeGoal | string | null | undefined): string {
  if (!goal) return ''
  if (isNarrativeGoal(goal)) return GOAL_LABELS[goal]
  // Humanize an unknown value safely.
  return goal.charAt(0).toUpperCase() + goal.slice(1)
}
