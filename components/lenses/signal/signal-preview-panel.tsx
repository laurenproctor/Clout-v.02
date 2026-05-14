'use client'

import type { SignalOutput } from '@/lib/lenses/signal/signalTypes'
import { WeakSignalCard } from './weak-signal-card'
import { ImplicationCard } from './implication-card'

const SHIFT_TIMEFRAME_LABELS: Record<string, string> = {
  emerging: 'Emerging',
  accelerating: 'Accelerating',
  mainstreaming: 'Mainstreaming',
  late_stage: 'Late stage',
}

interface SignalPreviewPanelProps {
  output: SignalOutput
}

export function SignalPreviewPanel({ output }: SignalPreviewPanelProps) {
  const sortedSignals = [...output.weakSignals].sort((a, b) => b.momentum - a.momentum)

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Score header */}
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Signal Score</p>
          <p className="text-4xl font-light tabular-nums">{output.signalScore}</p>
        </div>
      </div>

      {/* Strongest Signal */}
      {output.strongestSignal && (
        <section className="space-y-2 border-l-2 border-foreground pl-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Strongest Signal</p>
          <p className="text-sm">{output.strongestSignal}</p>
        </section>
      )}

      {/* Signal Risk — shown prominently when present */}
      {output.signalRisk && (
        <section className="border border-amber-200 dark:border-amber-800 rounded-sm p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-amber-600 dark:text-amber-400 text-xs">⚠</span>
            <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              Signal Risk — {Math.round(output.signalRisk.falseSignalRisk * 100)}% false signal likelihood
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{output.signalRisk.reason}</p>
        </section>
      )}

      {/* Signal Asymmetry — only shown when present */}
      {output.signalAsymmetry && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Signal Asymmetry</p>
          <p className="text-sm italic">{output.signalAsymmetry}</p>
        </section>
      )}

      {/* Directional Shifts */}
      {output.directionalShifts.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Directional Shifts</p>
          <div className="space-y-3">
            {output.directionalShifts.map((d, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-sm">
                    {SHIFT_TIMEFRAME_LABELS[d.timeframe] ?? d.timeframe}
                  </span>
                </div>
                <p className="text-sm font-medium">{d.shift}</p>
                <div className="space-y-1">
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">From</span>
                    <p className="text-sm text-muted-foreground">{d.previousState}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-foreground shrink-0 mt-0.5">→</span>
                    <p className="text-sm">{d.emergingState}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Structural Transitions */}
      {output.structuralTransitions.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Structural Transitions</p>
          <div className="space-y-3">
            {output.structuralTransitions.map((t, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium">{t.transition}</p>
                <p className="text-xs text-muted-foreground">Driver: {t.driver}</p>
                <p className="text-sm text-muted-foreground">{t.implication}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground shrink-0">Severity</p>
                  <div className="flex-1 bg-muted rounded-full h-px">
                    <div
                      className="bg-foreground h-px rounded-full transition-all"
                      style={{ width: `${t.severity * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(t.severity * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Incentive Changes */}
      {output.incentiveChanges.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Incentive Changes</p>
          <div className="space-y-3">
            {output.incentiveChanges.map((c, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <div className="space-y-1">
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-muted-foreground shrink-0 mt-0.5">Was</span>
                    <p className="text-sm text-muted-foreground">{c.oldIncentive}</p>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="text-xs text-foreground shrink-0 mt-0.5">→</span>
                    <p className="text-sm">{c.newIncentive}</p>
                  </div>
                </div>
                {c.affectedGroups.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Affects: {c.affectedGroups.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Weak Signals */}
      {sortedSignals.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Weak Signals</p>
          <div className="space-y-3">
            {sortedSignals.map((s, i) => (
              <WeakSignalCard key={i} signal={s} />
            ))}
          </div>
        </section>
      )}

      {/* Future Implications */}
      {output.futureImplications.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Future Implications</p>
          <div className="space-y-3">
            {output.futureImplications.map((impl, i) => (
              <ImplicationCard key={i} implication={impl} />
            ))}
          </div>
        </section>
      )}

      {/* Strategic Implication */}
      {output.strategicImplication && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Strategic Implication</p>
          <p className="text-sm">{output.strategicImplication}</p>
        </section>
      )}

      {/* Rewritten Content */}
      <section className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Rewritten Content</p>
        <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed">
          {output.rewrittenContent}
        </div>
        {output.signalSummary && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-4">
            {output.signalSummary}
          </p>
        )}
      </section>
    </div>
  )
}
