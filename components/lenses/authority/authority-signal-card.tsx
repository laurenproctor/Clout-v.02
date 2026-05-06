'use client'

import type { AuthoritySignal } from '@/lib/lenses/authority/authorityTypes'

const TYPE_LABELS: Record<string, string> = {
  lived_experience: 'Lived Experience',
  operational_specificity: 'Operational Specificity',
  strategic_vulnerability: 'Strategic Vulnerability',
  earned_authority: 'Earned Authority',
  pattern_recognition: 'Pattern Recognition',
  evidence_backing: 'Evidence Backing',
  historical_reference: 'Historical Reference',
  conviction_calibration: 'Conviction Calibration',
  expert_language: 'Expert Language',
  comparative_reasoning: 'Comparative Reasoning',
}

interface AuthoritySignalCardProps {
  signal: AuthoritySignal
}

export function AuthoritySignalCard({ signal }: AuthoritySignalCardProps) {
  if (signal.confidence < 0.4) return null

  return (
    <div className="border border-border rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {TYPE_LABELS[signal.type] ?? signal.type}
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.round(signal.confidence * 100)}% confidence
        </span>
      </div>

      <div className="w-full bg-muted rounded-full h-px">
        <div
          className="bg-foreground h-px rounded-full transition-all"
          style={{ width: `${signal.strength * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Observation</p>
          <p className="text-sm">{signal.observation}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Interpretation</p>
          <p className="text-sm text-muted-foreground">{signal.interpretation}</p>
        </div>
      </div>
    </div>
  )
}
