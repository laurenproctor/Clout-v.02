'use client'

import type { TasteOutput } from '@/lib/lenses/taste/tasteTypes'
import { ClicheCard } from './cliche-card'
import { RestraintCard } from './restraint-card'

interface TastePreviewPanelProps {
  output: TasteOutput
}

const POSTURE_LABELS: Record<string, string> = {
  restrained: 'Restrained',
  warm: 'Warm',
  sharp: 'Sharp',
  reflective: 'Reflective',
  urgent: 'Urgent',
  measured: 'Measured',
  playful: 'Playful',
}

export function TastePreviewPanel({ output }: TastePreviewPanelProps) {
  return (
    <div className="space-y-8 max-w-2xl">

      {/* Score header */}
      <div className="flex items-baseline justify-between border-b border-border pb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Taste Score</p>
          <p className="text-4xl font-light tabular-nums">{output.tasteScore}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Emotional Posture</p>
          <p className="text-sm">
            {POSTURE_LABELS[output.emotionalTexture.emotionalPosture] ?? output.emotionalTexture.emotionalPosture}
          </p>
        </div>
      </div>

      {/* Strongest line */}
      {output.strongestLine && (
        <section className="space-y-2 border-l-2 border-foreground pl-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Strongest Line</p>
          <p className="text-sm">"{output.strongestLine}"</p>
        </section>
      )}

      {/* Identity anchors — what must survive refinement */}
      {output.tasteAnchors.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Identity Anchors</p>
          <div className="space-y-3">
            {output.tasteAnchors.map((anchor, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium">"{anchor.element}"</p>
                <p className="text-sm text-muted-foreground">{anchor.reasonPreserve}</p>
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex-1 bg-muted rounded-full h-px">
                    <div
                      className="bg-foreground h-px rounded-full transition-all"
                      style={{ width: `${anchor.distinctiveness * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(anchor.distinctiveness * 100)}% distinctive
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Cliché detection */}
      {output.clichePatterns.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Cliché Detection ({output.clichePatterns.length})
          </p>
          <div className="space-y-3">
            {output.clichePatterns.map((pattern, i) => (
              <ClicheCard key={i} pattern={pattern} />
            ))}
          </div>
        </section>
      )}

      {/* Restraint opportunities */}
      {output.restraintOpportunities.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Restraint Opportunities ({output.restraintOpportunities.length})
          </p>
          <div className="space-y-3">
            {output.restraintOpportunities.map((opp, i) => (
              <RestraintCard key={i} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* Cultural precision */}
      {output.culturalPrecision.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Cultural Precision</p>
          <div className="space-y-3">
            {output.culturalPrecision.map((p, i) => (
              <div key={i} className="border border-border rounded-sm p-4 space-y-2">
                <p className="text-sm font-medium">"{p.signal}"</p>
                <p className="text-sm text-muted-foreground">{p.explanation}</p>
                <div className="flex items-center gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">specificity</p>
                  <div className="flex-1 bg-muted rounded-full h-px">
                    <div
                      className="bg-foreground h-px rounded-full transition-all"
                      style={{ width: `${p.specificity * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {Math.round(p.specificity * 100)}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Emotional texture */}
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Emotional Texture</p>
        <div className="flex items-center gap-4">
          <p className="text-sm">
            {POSTURE_LABELS[output.emotionalTexture.emotionalPosture] ?? output.emotionalTexture.emotionalPosture}
          </p>
          <div className="flex items-center gap-2 flex-1">
            <div className="flex-1 bg-muted rounded-full h-px">
              <div
                className="bg-foreground h-px rounded-full transition-all"
                style={{ width: `${output.emotionalTexture.consistency * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground tabular-nums">
              {Math.round(output.emotionalTexture.consistency * 100)}% consistent
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{output.emotionalTexture.explanation}</p>
      </section>

      {/* Rewritten content */}
      <section className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Rewritten Content</p>
        <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap leading-relaxed">
          {output.rewrittenContent}
        </div>
      </section>

      {/* Taste summary + refinement note */}
      <section className="space-y-2 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">{output.tasteSummary}</p>
        {output.refinementNote && (
          <p className="text-xs text-muted-foreground">{output.refinementNote}</p>
        )}
      </section>

    </div>
  )
}
