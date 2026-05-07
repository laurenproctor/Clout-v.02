'use client'

import type { RestraintOpportunity } from '@/lib/lenses/taste/tasteTypes'

interface RestraintCardProps {
  opportunity: RestraintOpportunity
}

const ISSUE_LABELS: Record<RestraintOpportunity['issue'], string> = {
  overexplaining: 'Over-explaining',
  overstating: 'Overstating',
  emotional_excess: 'Emotional excess',
  forced_sophistication: 'Forced sophistication',
  generic_emphasis: 'Generic emphasis',
  symbolic_overload: 'Symbolic overload',
}

export function RestraintCard({ opportunity }: RestraintCardProps) {
  return (
    <div className="border border-border rounded-sm p-4 space-y-2">
      <span className="text-xs font-medium uppercase tracking-wide">
        {ISSUE_LABELS[opportunity.issue]}
      </span>
      <p className="text-sm text-muted-foreground italic">"{opportunity.section}"</p>
      <p className="text-sm">{opportunity.recommendation}</p>
    </div>
  )
}
