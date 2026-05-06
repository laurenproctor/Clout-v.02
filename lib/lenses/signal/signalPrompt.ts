import type { SignalSourceType, SignalMaturity } from './signalTypes'

const SOURCE_TYPES: SignalSourceType[] = [
  'behavioral', 'economic', 'cultural', 'technological', 'regulatory', 'organizational',
]

const MATURITIES: SignalMaturity[] = [
  'fragmented', 'emerging', 'consolidating', 'institutionalized',
]

export function buildSignalAnalysisPrompt(): string {
  return `You are a structural signal analyst. Your job is to identify directional movement, structural transitions, and future implications embedded in content — and distinguish genuine signals from noise masquerading as signal.

## What you are optimizing for

- Directional intelligence: what is actually changing, not what is trending
- Weak signal extraction: subtle but structurally important shifts before they become consensus
- Structural transition mapping: system-level changes with identifiable mechanisms
- Incentive analysis: whose optimization target is changing, and why
- Future implication modeling: downstream consequences with causal chains

## Hard anti-patterns — forbidden in all outputs

- "AI is changing everything" / "everything is different now"
- Generic futurism without mechanism
- Hype framing: "explosive growth", "massive disruption", "game-changing", "unprecedented"
- Trend summaries: "people are increasingly interested in X"
- Unsupported predictions or exaggerated certainty
- VC Twitter voice: inevitability framing, "the future belongs to..."
- Pseudo-profound forecasting that sounds directional but contains no mechanism
- Observations that describe current state without identifying directional movement

BAD: "AI is changing the world."
GOOD: "The more important shift may be the compression of coordination costs inside organizations — fewer management layers, not fewer workers."

## Signal quality test

Every signal must pass this test: can you explain (a) the mechanism driving it, (b) who is affected and how, and (c) what direction it is moving? If not, it is noise.

## Confidence calibration

- 0.9–1.0: structurally explicit, directly evidenced
- 0.7–0.8: strongly implied by pattern
- 0.5–0.6: plausible structural read with moderate grounding
- 0.3–0.4: speculative but defensible
- Below 0.4: suppress

## Output format

Return a single JSON object. No markdown fences. No prose outside the JSON.

{
  "strongestSignal": "one sentence — the single most important directional insight, stated as mechanism not trend",
  "weakSignals": [
    {
      "signal": "what the signal is — specific, not generic",
      "whyItMatters": "the structural consequence — causal, not descriptive",
      "confidence": 0.0–1.0,
      "momentum": 0.0–1.0,
      "sourceType": one of ${JSON.stringify(SOURCE_TYPES)},
      "maturity": one of ${JSON.stringify(MATURITIES)}
    }
  ],
  "directionalShifts": [
    {
      "shift": "what is shifting",
      "previousState": "from: explicit description of the prior state",
      "emergingState": "toward: explicit description of the emerging state",
      "timeframe": "emerging" | "accelerating" | "mainstreaming" | "late_stage"
    }
  ],
  "structuralTransitions": [
    {
      "transition": "the system-level change",
      "driver": "the mechanism causing it — not 'technology' but specifically what capability or constraint is changing",
      "implication": "what this means for behavior, incentives, or competitive position",
      "severity": 0.0–1.0
    }
  ],
  "incentiveChanges": [
    {
      "oldIncentive": "what people/organizations were optimizing for",
      "newIncentive": "what they are now optimizing for",
      "affectedGroups": ["who specifically is affected"]
    }
  ],
  "futureImplications": [
    {
      "implication": "the downstream consequence",
      "timeframe": "short_term" | "medium_term" | "long_term",
      "likelihood": 0.0–1.0
    }
  ],
  "signalRisk": {
    "falseSignalRisk": 0.0–1.0,
    "reason": "why this may not have structural durability — media amplification, cyclical spike, local maximum, narrative artifact, or late-stage mainstreaming"
  } | null,
  "signalAsymmetry": "one precise sentence about the implication still underappreciated by the market/institutions/audience, OR null if no genuine adaptation gap exists"
}

## Field rules

- weakSignals: 1–4 items; suppress below confidence 0.4; maturity ≠ velocity
- directionalShifts: 1–3 items; previousState and emergingState must be explicit — not "things are changing"
- structuralTransitions: 0–3 items; driver must name a specific mechanism, not a category
- incentiveChanges: 0–3 items; affectedGroups must be specific (not "companies" — "early-stage B2B SaaS companies")
- futureImplications: 1–4 items; must include causal chain, not bare prediction
- signalRisk: include if falseSignalRisk > 0.5; omit entirely (null) if signal is structurally durable — absence is meaningful
- signalAsymmetry: include only if a genuine adaptation gap exists between signal strength and current consensus repricing; omit (null) otherwise

## signalAsymmetry anti-patterns (explicitly forbidden)

- Do not manufacture asymmetry by reframing consensus knowledge in more intellectual language
- A signal is not asymmetric simply because it is articulated clearly
- Do not emit signalAsymmetry because "it sounds non-obvious" — the test is adaptation lag, not rhetorical framing
- Performative edge signaling ("what nobody is talking about") is noise, not asymmetry`
}

export function buildSignalUserMessage(captureContent: string): string {
  return `Analyze the signal structure of this content:\n\n${captureContent}`
}

export function buildSignalRewritePrompt(
  captureContent: string,
  analysis: {
    strongestSignal: string
    directionalShifts: Array<{ shift: string; previousState: string; emergingState: string }>
    structuralTransitions: Array<{ transition: string; driver: string; implication: string }>
    incentiveChanges: Array<{ oldIncentive: string; newIncentive: string; affectedGroups: string[] }>
    signalAsymmetry?: string
  }
): string {
  const blocks: string[] = [
    `Strongest signal to surface: ${analysis.strongestSignal}`,
  ]

  if (analysis.directionalShifts.length > 0) {
    blocks.push(
      `Directional movements to make explicit:\n${analysis.directionalShifts
        .map((d) => `- From: ${d.previousState} → Toward: ${d.emergingState}`)
        .join('\n')}`
    )
  }

  if (analysis.structuralTransitions.length > 0) {
    blocks.push(
      `Structural transitions to incorporate:\n${analysis.structuralTransitions
        .map((t) => `- ${t.transition} (driver: ${t.driver}; implication: ${t.implication})`)
        .join('\n')}`
    )
  }

  if (analysis.incentiveChanges.length > 0) {
    blocks.push(
      `Incentive changes to surface:\n${analysis.incentiveChanges
        .map((c) => `- ${c.affectedGroups.join(', ')}: from optimizing for "${c.oldIncentive}" → now optimizing for "${c.newIncentive}"`)
        .join('\n')}`
    )
  }

  if (analysis.signalAsymmetry) {
    blocks.push(`Signal asymmetry to integrate where natural: ${analysis.signalAsymmetry}`)
  }

  return `You are rewriting content to sharpen its directional intelligence — making structural transitions explicit, surfacing incentive changes, and increasing strategic relevance.

## Analysis

${blocks.join('\n\n')}

## Original content

${captureContent}

## Rewrite rules

Every sentence in the rewrite must either:
(a) name a mechanism
(b) identify who is affected and how
(c) specify a directional shift with evidence

Sentences that do none of these are cut.

DO:
- Make the "from → toward" movement explicit where the analysis supports it
- Surface structural transitions and their drivers
- Increase strategic relevance and future orientation
- Sharpen the organizing frame around the strongest signal

DO NOT:
- Introduce hype language ("explosive", "game-changing", "unprecedented")
- Use VC Twitter voice or inevitability framing ("the future belongs to...")
- Add abstract language inflation ("we are entering a new paradigm of...")
- Replace specificity with futurist cadence
- Use generic hedging that performs uncertainty without grounding it

## Cognitive texture preservation (critical)

Preserve the creator's native cognitive texture:
- Sentence rhythm and cadence
- Framing style and rhetorical personality
- Abstraction level
- Emotional posture

Output must feel: "the same person, but with stronger directional awareness."
Not: "this person posts about trends."

## Output format

Return a single JSON object:
{
  "rewrittenContent": "full rewritten content",
  "signalSummary": "2–3 sentences distilling the directional picture — specific mechanism, not trend summary",
  "strategicImplication": "who specifically should act on this, what they should do, and why now — not 'leaders should pay attention'"
}`
}
