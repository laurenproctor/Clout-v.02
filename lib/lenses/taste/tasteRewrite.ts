import type { ClichePattern, RestraintOpportunity, EmotionalTexture, TasteAnchor } from './tasteTypes'

export function buildTasteRewritePrompt(
  captureContent: string,
  analysis: {
    clichePatterns: ClichePattern[]
    restraintOpportunities: RestraintOpportunity[]
    emotionalTexture: EmotionalTexture
    tasteAnchors: TasteAnchor[]
    strongestLine: string
    refinementNote: string
  }
): string {
  const blocks: string[] = []

  if (analysis.tasteAnchors.length > 0) {
    blocks.push(
      `PROTECTED — these elements create identity gravity and must survive refinement:\n${analysis.tasteAnchors
        .map((a) => `- "${a.element}" — ${a.reasonPreserve}`)
        .join('\n')}`
    )
  }

  if (analysis.clichePatterns.length > 0) {
    const severe = analysis.clichePatterns.filter((c) => c.severity >= 0.5)
    if (severe.length > 0) {
      blocks.push(
        `Clichés to remove or replace:\n${severe
          .map((c) => `- "${c.phrase}" — ${c.reasonWeak}${c.replacementStrategy ? ` (approach: ${c.replacementStrategy})` : ''}`)
          .join('\n')}`
      )
    }
  }

  if (analysis.restraintOpportunities.length > 0) {
    blocks.push(
      `Restraint opportunities — reduce or remove:\n${analysis.restraintOpportunities
        .map((r) => `- [${r.issue}] ${r.section}: ${r.recommendation}`)
        .join('\n')}`
    )
  }

  blocks.push(
    `Emotional posture to preserve: ${analysis.emotionalTexture.emotionalPosture} (consistency: ${Math.round(analysis.emotionalTexture.consistency * 100)}%)`
  )

  blocks.push(`Strongest line to protect: "${analysis.strongestLine}"`)
  blocks.push(`Highest-leverage change: ${analysis.refinementNote}`)

  return `You are refining content for discernment — removing what dilutes it and sharpening what makes it distinctive. The goal is a version that feels more intentional, not more polished.

## Analysis

${blocks.join('\n\n')}

## Original content

${captureContent}

## Rewrite rules

Apply the analysis above. For each change:
(a) remove or replace cliché phrases where severity was high
(b) reduce the sections flagged for over-explaining or over-stating
(c) preserve the emotional posture — do not flatten or shift it
(d) protect all anchors and the strongest line verbatim or nearly verbatim

DO:
- Remove what dilutes — unnecessary explanation, over-stated claims, worn phrases
- Sharpen what already works — make the strong lines stronger through context and placement
- Preserve the creator's rhythm, vocabulary, and abstraction level
- Keep emotional energy — only recalibrate inconsistencies, not intensity

DO NOT:
- Minimize for its own sake — if something works, keep it
- Shift the register toward "elevated" or "intellectual"
- Remove personality, humor, or emotional directness
- Add sophistication markers — shorter and plainer is usually the move, not grander
- Rewrite the entire piece — preserve as much original language as possible
- Touch the protected anchors

## Cognitive texture preservation (critical)

The output must feel: "the same person, but more intentional."
Not: "this was professionally edited."
Not: "this person now sounds refined."

Preserve:
- sentence rhythm and cadence
- vocabulary and framing style
- abstraction level
- emotional posture

## Output format

Return a single JSON object:
{
  "rewrittenContent": "the refined content — same voice, higher discernment"
}`
}
