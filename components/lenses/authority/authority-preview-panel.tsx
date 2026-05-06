'use client'

import type { AuthorityOutput } from '@/lib/lenses/authority/authorityTypes'
import { AuthoritySignalCard } from './authority-signal-card'
import { EvidenceCard } from './evidence-card'

const SOURCE_LABELS: Record<string, string> = {
  operational_experience: 'Operational Experience',
  research_depth: 'Research Depth',
  historical_knowledge: 'Historical Knowledge',
  strategic_pattern_recognition: 'Strategic Pattern Recognition',
  technical_expertise: 'Technical Expertise',
  cultural_positioning: 'Cultural Positioning',
  founder_experience: 'Founder Experience',
}

const RESISTANCE_LABELS: Record<string, string> = {
  unsupported_claim: 'Unsupported Claim',
  premature_conclusion: 'Premature Conclusion',
  generic_language: 'Generic Language',
  overconfidence: 'Overconfidence',
  lack_of_evidence: 'Lack of Evidence',
  vague_abstraction: 'Vague Abstraction',
  weak_operational_depth: 'Weak Operational Depth',
  contrarian_without_support: 'Contrarian Without Support',
}

interface AuthorityPreviewPanelProps {
  output: AuthorityOutput
}

export function AuthorityPreviewPanel({ output }: AuthorityPreviewPanelProps) {
  return (
    <div className="space-y-8 max-w-2xl">
      {/* Score header */}
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Authority Score</p>
          <p className="text-4xl font-light tabular-nums">{output.authorityScore}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Native Authority</p>
          <p className="text-sm">
            {SOURCE_LABELS[output.nativeAuthoritySource] ?? output.nativeAuthoritySource}
          </p>
        </div>
      </div>

      {/* Trust Mechanisms */}
      {output.trustMechanisms.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Trust Mechanisms</p>
          <div className="space-y-3">
            {output.trustMechanisms.map((signal, i) => (
              <AuthoritySignalCard key={i} signal={signal} />
            ))}
          </div>
        </section>
      )}

      {/* Resistance Points */}
      {output.resistancePoints.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Resistance Points</p>
          <div className="space-y-2">
            {output.resistancePoints.map((r, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <span className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">⚠</span>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {RESISTANCE_LABELS[r.type] ?? r.type}
                    </p>
                    <p className="text-xs text-muted-foreground shrink-0">
                      severity {Math.round(r.severity * 100)}%
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.explanation}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Evidence */}
      {output.retrievedEvidence.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Evidence Retrieved ({output.retrievedEvidence.length})
          </p>
          {output.evidenceSemanticValidationNotes && (
            <p className="text-xs text-muted-foreground italic">
              {output.evidenceSemanticValidationNotes}
            </p>
          )}
          <div className="space-y-3">
            {output.retrievedEvidence.map((e, i) => (
              <EvidenceCard key={i} evidence={e} index={i} />
            ))}
          </div>
        </section>
      )}

      {output.evidenceRetrievalFailed && output.retrievedEvidence.length === 0 && (
        <section>
          <p className="text-xs text-muted-foreground">
            Evidence retrieval unavailable — authority strengthened through operational framing.
          </p>
        </section>
      )}

      {/* Confidence Calibration */}
      {output.confidenceCalibration && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Confidence Calibration</p>
          <p className="text-sm text-muted-foreground">{output.confidenceCalibration}</p>
        </section>
      )}

      {/* Rewritten Content */}
      <section className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          Rewritten Content
          {!output.rewriteUsedEvidence && (
            <span className="ml-2 normal-case">(operational framing)</span>
          )}
        </p>
        <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed">
          {output.rewrittenContent}
        </div>
        {output.credibilityDensityNote && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-4">
            {output.credibilityDensityNote}
          </p>
        )}
      </section>
    </div>
  )
}
