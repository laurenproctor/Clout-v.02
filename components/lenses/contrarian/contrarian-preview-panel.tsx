'use client'

import type { ContrarianOutput } from '@/lib/lenses/contrarian/contrarianTypes'
import { TensionCard } from './tension-card'
import { AsymmetryCard } from './asymmetry-card'

interface ContrarianPreviewPanelProps {
  output: ContrarianOutput
}

export function ContrarianPreviewPanel({ output }: ContrarianPreviewPanelProps) {
  return (
    <div className="space-y-8 max-w-2xl">
      {/* Score header */}
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Contrarian Score</p>
          <p className="text-4xl font-light tabular-nums">{output.contrarianScore}</p>
        </div>
      </div>

      {/* Consensus Frame */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Consensus Frame</p>
        <p className="text-sm">{output.consensusFrame.statement}</p>
      </section>

      {/* Hidden Assumptions */}
      {output.hiddenAssumptions.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Hidden Assumptions</p>
          <div className="space-y-3">
            {output.hiddenAssumptions.map((a, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium">{a.assumption}</p>
                <p className="text-sm text-muted-foreground">{a.whyItMatters}</p>
                <p className="text-xs text-muted-foreground">
                  Confidence {Math.round(a.confidence * 100)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Strongest Asymmetry */}
      {output.strongestAsymmetry && (
        <section className="space-y-2 border-l-2 border-foreground pl-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Strongest Asymmetry</p>
          <p className="text-sm">{output.strongestAsymmetry}</p>
        </section>
      )}

      {/* Reversal Mechanisms */}
      {output.reversalMechanisms.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Reversal Mechanisms</p>
          <div className="space-y-3">
            {output.reversalMechanisms.map((r, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium">{r.mechanism}</p>
                <p className="text-sm text-muted-foreground">{r.explanation}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">Strength</p>
                  <div className="flex-1 bg-muted rounded-full h-px">
                    <div
                      className="bg-foreground h-px rounded-full transition-all"
                      style={{ width: `${r.strength * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(r.strength * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Second Order Effects */}
      {output.secondOrderEffects.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Second-Order Effects</p>
          <div className="space-y-3">
            {output.secondOrderEffects.map((e, i) => (
              <AsymmetryCard key={i} effect={e} />
            ))}
          </div>
        </section>
      )}

      {/* Tension Points */}
      {output.tensionPoints.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Structural Tensions</p>
          <div className="space-y-3">
            {output.tensionPoints.map((t, i) => (
              <TensionCard key={i} tension={t} />
            ))}
          </div>
        </section>
      )}

      {/* Resistance Prediction */}
      {output.resistancePrediction && (
        <section className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Resistance Prediction</p>
          <p className="text-sm text-muted-foreground">{output.resistancePrediction}</p>
        </section>
      )}

      {/* Rewritten Content */}
      <section className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Rewritten Content</p>
        <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed">
          {output.rewrittenContent}
        </div>
        {output.distinctionNote && (
          <p className="text-xs text-muted-foreground border-t border-border pt-3 mt-4">
            {output.distinctionNote}
          </p>
        )}
      </section>
    </div>
  )
}
