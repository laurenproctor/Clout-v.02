'use client'

import type { Evidence } from '@/lib/evidence/evidenceTypes'

const ROLE_LABELS: Record<string, string> = {
  hook: 'Hook',
  support: 'Support',
  contrast: 'Contrast',
  credibility_anchor: 'Credibility Anchor',
  historical_context: 'Historical Context',
}

const TYPE_LABELS: Record<string, string> = {
  market_data: 'Market Data',
  research: 'Research',
  historical: 'Historical',
  operational: 'Operational',
  industry_report: 'Industry Report',
  benchmark: 'Benchmark',
  behavioral: 'Behavioral',
  comparative: 'Comparative',
}

interface EvidenceCardProps {
  evidence: Evidence
  index: number
}

export function EvidenceCard({ evidence }: EvidenceCardProps) {
  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm">
            {TYPE_LABELS[evidence.evidenceType] ?? evidence.evidenceType}
          </span>
          <span className="text-xs text-muted-foreground">
            {ROLE_LABELS[evidence.integrationRole] ?? evidence.integrationRole}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          freshness {Math.round(evidence.freshnessScore * 100)}%
        </span>
      </div>

      <p className="text-sm">{evidence.supportingFact}</p>

      {evidence.evidenceContribution !== undefined && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Contribution to rewrite</p>
          <div className="w-full bg-muted rounded-full h-px">
            <div
              className="bg-foreground h-px rounded-full transition-all"
              style={{ width: `${evidence.evidenceContribution * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {evidence.sourceUrl ? (
          <a
            href={evidence.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline truncate block"
          >
            {evidence.source}
          </a>
        ) : (
          <span>{evidence.source}</span>
        )}
      </div>
    </div>
  )
}
