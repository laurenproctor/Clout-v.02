'use client'

import { SignalCard } from './SignalCard'
import type { SyndicateAnalysisResult } from '@/lib/syndicate/types/analysis'
import type { SignalFamily } from '@/lib/syndicate/types/signals'
import { SIGNAL_FAMILY_LABELS } from '@/lib/syndicate/types/signals'

interface SyndicateResultsProps {
  result: SyndicateAnalysisResult
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">
      {children}
    </h2>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-700 leading-relaxed">{children}</p>
}

function BulletList({ items }: { items: string[] }) {
  if (!items.length) return null
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-sm text-zinc-700 leading-relaxed">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-300" />
          {item}
        </li>
      ))}
    </ul>
  )
}

export function SyndicateResults({ result }: SyndicateResultsProps) {
  const { strategicRead, narrativeShape, signals, counterfactual, content } = result

  // Group signals by family, filter out very low confidence already suppressed upstream
  const signalsByFamily = signals.reduce<Partial<Record<SignalFamily, typeof signals>>>(
    (acc, s) => {
      if (!acc[s.family]) acc[s.family] = []
      acc[s.family]!.push(s)
      return acc
    },
    {},
  )
  const familiesPresent = Object.keys(signalsByFamily) as SignalFamily[]

  const failureModeLabels: Record<string, string> = {
    abstraction_overload: 'Abstraction overload',
    insufficient_specificity: 'Insufficient specificity',
    premature_thesis_reveal: 'Premature thesis reveal',
    emotional_flatness: 'Emotional flatness',
    unsupported_contrarianism: 'Unsupported contrarianism',
    weak_payoff: 'Weak payoff',
    low_tension: 'Low tension',
    audience_mismatch: 'Audience mismatch',
    over_context_dependence: 'Over-context dependence',
    status_imbalance: 'Status imbalance',
  }

  return (
    <div className="space-y-12">
      {/* Source meta */}
      <div className="border-b border-zinc-100 pb-6">
        <p className="text-xs text-zinc-400 mb-1">{content.siteName ?? new URL(content.url).hostname}</p>
        <h1 className="text-lg font-medium text-zinc-900 leading-snug mb-1">{content.title}</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {content.author && <span>{content.author}</span>}
          {content.estimatedReadTime && <span>{content.estimatedReadTime} min read</span>}
        </div>
      </div>

      {/* 1. Summary */}
      <section>
        <SectionHeading>Summary</SectionHeading>
        <Prose>{strategicRead.summary}</Prose>
        {strategicRead.strategicTakeaways.length > 0 && (
          <div className="mt-6 space-y-0.5">
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Strategic takeaways</p>
            <BulletList items={strategicRead.strategicTakeaways} />
          </div>
        )}
      </section>

      {/* 2. Narrative Shape — first-class section */}
      <section>
        <SectionHeading>Narrative Shape</SectionHeading>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Structure</p>
            <p className="text-sm font-mono text-zinc-600 bg-zinc-50 rounded px-3 py-2 leading-relaxed">
              {narrativeShape.structure}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Reveal timing</p>
              <Prose>{narrativeShape.revealTiming}</Prose>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Tension curve</p>
              <Prose>{narrativeShape.tensionCurve}</Prose>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Escalation</p>
              <Prose>{narrativeShape.escalation}</Prose>
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Pacing</p>
              <Prose>{narrativeShape.pacingNotes}</Prose>
            </div>
          </div>
          {narrativeShape.vulnerabilitySequencing && (
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5">Vulnerability sequencing</p>
              <Prose>{narrativeShape.vulnerabilitySequencing}</Prose>
            </div>
          )}
        </div>
      </section>

      {/* 3. Signal Breakdown */}
      {signals.length > 0 && (
        <section>
          <SectionHeading>Signal Breakdown</SectionHeading>
          <div className="space-y-8">
            {familiesPresent.map((family) => {
              const familySignals = signalsByFamily[family] ?? []
              return (
                <div key={family}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-300 mb-3">
                    {SIGNAL_FAMILY_LABELS[family]}
                  </p>
                  <div className="space-y-3">
                    {familySignals.map((signal, i) => (
                      <SignalCard key={i} signal={signal} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* 4. Why It Works */}
      <section>
        <SectionHeading>Why It Works</SectionHeading>
        <BulletList items={strategicRead.whyItWorks} />
      </section>

      {/* 5. Counterfactual + Weaknesses */}
      <section>
        <SectionHeading>Counterfactual Analysis</SectionHeading>
        <div className="space-y-6">
          {counterfactual.loadBearingElements.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Load-bearing elements</p>
              <BulletList items={counterfactual.loadBearingElements} />
            </div>
          )}
          {counterfactual.removalImpacts.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">If removed…</p>
              <BulletList items={counterfactual.removalImpacts} />
            </div>
          )}
          {counterfactual.trustVsResistanceDrivers.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Trust vs resistance</p>
              <BulletList items={counterfactual.trustVsResistanceDrivers} />
            </div>
          )}

          {/* Weaknesses — amber accent */}
          {(counterfactual.weaknesses.length > 0 || counterfactual.failureModes.length > 0) && (
            <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Weaknesses</p>
              {counterfactual.failureModes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {counterfactual.failureModes.map((mode) => (
                    <span
                      key={mode}
                      className="text-xs rounded-full border border-amber-200 bg-white px-2.5 py-0.5 text-amber-700"
                    >
                      {failureModeLabels[mode] ?? mode.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              )}
              {counterfactual.weaknesses.length > 0 && (
                <ul className="space-y-2">
                  {counterfactual.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-amber-800 leading-relaxed">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Footer meta */}
      <div className="border-t border-zinc-100 pt-4 flex items-center justify-between">
        <p className="text-xs text-zinc-300">
          {signals.length} signal{signals.length !== 1 ? 's' : ''} identified
          {' · '}
          ontology v{result.meta.ontologyVersion}
        </p>
        <p className="text-xs text-zinc-300">
          {Object.values(result.meta.timingMs).reduce((a, b) => a + b, 0) / 1000}s
        </p>
      </div>
    </div>
  )
}
