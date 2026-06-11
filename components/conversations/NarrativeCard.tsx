'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { ComputedNarrative, ConversationOpportunityType, ConversationSourceType } from '@/types/domain'

const SOURCE_CLS: Record<string, string> = {
  substack:       'bg-orange-50 text-orange-700 border-orange-200',
  substack_notes: 'bg-purple-50 text-purple-700 border-purple-200',
  rss:            'bg-blue-50 text-blue-700 border-blue-200',
  generic:        'bg-zinc-50 text-zinc-600 border-zinc-200',
  reddit:         'bg-red-50 text-red-700 border-red-200',
  linkedin:       'bg-blue-50 text-blue-700 border-blue-200',
}

const OPP_TYPE_LABELS: Record<ConversationOpportunityType, string> = {
  comment:      'Comment',
  note:         'Note',
  post:         'Post',
  framework:    'Framework',
  narrative:    'Narrative',
  question:     'Question',
  counterpoint: 'Counterpoint',
  agreement:    'Agreement',
  pain_point:   'Pain Point',
}

interface Props { narrative: ComputedNarrative }

export function NarrativeCard({ narrative: n }: Props) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor =
    n.narrativeScore >= 70 ? 'bg-green-100 text-green-700 border-green-200' :
    n.narrativeScore >= 45 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-muted text-muted-foreground border-border'

  const showVelocity = Math.abs(n.velocityPct) >= 5
  const velocityLabel = n.velocityPct > 0 ? `+${n.velocityPct}%` : `${n.velocityPct}%`
  const velocityCls = n.velocityPct > 0
    ? 'bg-green-50 text-green-700 border-green-200'
    : 'bg-amber-50 text-amber-700 border-amber-200'

  // Group top opportunities by source type for evidence view
  const bySource = n.topOpportunities.reduce<Record<string, typeof n.topOpportunities>>(
    (acc, opp) => {
      const key = opp.sourceType
      acc[key] = acc[key] ? [...acc[key], opp] : [opp]
      return acc
    },
    {}
  )

  return (
    <div className="border rounded-lg bg-card">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-sm font-medium leading-snug flex-1">{n.title}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {showVelocity && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${velocityCls}`}>
                {velocityLabel}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreColor}`}>
              {n.narrativeScore}
            </span>
          </div>
        </div>

        {/* Source pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {n.sourceSummary.map(s => (
            <span
              key={s.sourceType}
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${SOURCE_CLS[s.sourceType] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200'}`}
            >
              {s.label} · {s.count}
            </span>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed mb-2">{n.description}</p>

        {/* Why this matters */}
        {n.whyThisMatters && (
          <p className="text-sm text-foreground/80 italic leading-relaxed mb-3 pl-3 border-l-2 border-muted">
            {n.whyThisMatters}
          </p>
        )}

        {/* Footer: recommended action + expand */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {n.recommendedAction}
          </p>
          {n.topOpportunities.length > 0 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              {n.opportunityCount} conversation{n.opportunityCount !== 1 ? 's' : ''}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Evidence panel */}
      {expanded && n.topOpportunities.length > 0 && (
        <div className="border-t px-4 py-3 space-y-3">
          {Object.entries(bySource).map(([sourceType, opps]) => (
            <div key={sourceType}>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                {SOURCE_CLS[sourceType] ? (n.sourceSummary.find(s => s.sourceType === sourceType)?.label ?? sourceType) : sourceType}
              </p>
              <div className="space-y-1.5">
                {opps.map(opp => (
                  <div key={opp.id} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5 flex-shrink-0">
                      {OPP_TYPE_LABELS[opp.opportunityType] ?? opp.opportunityType}
                    </span>
                    <span className="text-xs text-foreground/80 leading-snug flex-1 min-w-0 truncate">
                      {opp.title}
                    </span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{opp.overallScore}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
