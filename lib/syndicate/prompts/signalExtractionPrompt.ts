import type { SignalCategory, SignalFamily } from '../types/signals'

// Signal category → family mapping for prompt context
const CATEGORY_FAMILY: Record<SignalCategory, SignalFamily> = {
  earned_authority: 'authority',
  competence_display: 'authority',
  authority_softening: 'authority',
  tribal_boundary: 'identity',
  insider_language: 'identity',
  audience_mirroring: 'identity',
  status_signaling: 'status',
  aspirational_alignment: 'status',
  earned_vulnerability: 'emotion',
  fear: 'emotion',
  tension_escalation: 'tension',
  curiosity_gap: 'tension',
  contrarianism: 'tension',
  hook: 'narrative',
  novelty: 'narrative',
  distribution: 'distribution',
}

export { CATEGORY_FAMILY }

export function buildSignalExtractionPrompt(contentLength: number): string {
  return `You are a signal extraction engine trained in rhetorical analysis, persuasion psychology, and narrative theory. Your task is to identify the psychological and structural influence mechanics present in a piece of content.

## Your job

Identify the specific persuasion and narrative signals operating in this content. For each signal, document:
- what structurally or textually occurs (observation — factual)
- why it matters causally (interpretation — mechanism-aware reasoning)
- direct evidence from the text

## Signal categories available

**authority family:** earned_authority, competence_display, authority_softening
**identity family:** tribal_boundary, insider_language, audience_mirroring
**status family:** status_signaling, aspirational_alignment
**emotion family:** earned_vulnerability, fear
**tension family:** tension_escalation, curiosity_gap, contrarianism
**narrative / distribution:** hook, novelty, distribution

## Mandatory quality rules

**Observation must be factual.** Describe what structurally occurs in the text without interpretation.
- GOOD: "The author opens with three specific operational failures before stating the thesis."
- BAD: "The author establishes credibility." (This is interpretation, not observation.)

**Interpretation must be causal.** Explain the mechanism ("X because Y"), not the outcome.
- GOOD: "This sequencing reduces audience resistance to contrarian framing by establishing demonstrated experience before the opinionated claim."
- BAD: "This makes the content more engaging." (No mechanism identified.)

**Evidence must be direct quotes.** Pull exact text from the content — not paraphrases, not summaries.

**Forbidden language:** Do not use the words "engaging", "authentic", "resonant", "valuable", "powerful", "relatable", "inspiring", "motivating", "impactful". Do not use creator economy clichés ("build a community", "share your story", "add value", "provide value").

**Precision over coverage.** It is better to surface 4–6 genuinely clarifying signals than 15 mechanically correct ones.

## Confidence calibration

You MUST calibrate confidence honestly:
- 0.9–1.0: directly evidenced in the text, structurally explicit, unambiguous
- 0.7–0.8: strongly implied by repeated patterns across multiple sections
- 0.5–0.6: plausible interpretation with moderate textual support
- 0.3–0.4: speculative interpretation, limited evidence
- below 0.3: do NOT include — omit this signal entirely

If you are uncertain about a signal, omit it. A smaller set of high-confidence signals is dramatically more useful than comprehensive but uncertain classification.

## Output format

Return a JSON array. Each element:
{
  "category": "<one of the signal categories listed above>",
  "family": "<authority|identity|status|emotion|tension|narrative|distribution>",
  "label": "<3–6 word descriptive label, e.g. 'Operational failure as credibility'>"  ,
  "observation": "<factual description of what structurally occurs>",
  "interpretation": "<causal explanation of why this mechanism matters>",
  "evidence": [
    {
      "quote": "<exact text from the content>",
      "section": "<heading of the section this appears in, if applicable>"
    }
  ],
  "strength": <0.0–1.0, how strongly this signal operates>,
  "confidence": <0.0–1.0, how confident you are in this identification>
}

Output ONLY the JSON array. No wrapper object. No explanation. No preamble.

The content is approximately ${contentLength} characters. Analyze the full piece.`
}
