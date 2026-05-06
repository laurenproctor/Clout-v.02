import type { NativeAuthoritySource } from './authorityTypes'

const NATIVE_AUTHORITY_SOURCES: NativeAuthoritySource[] = [
  'operational_experience',
  'research_depth',
  'historical_knowledge',
  'strategic_pattern_recognition',
  'technical_expertise',
  'cultural_positioning',
  'founder_experience',
]

export function buildAuthorityAnalysisPrompt(): string {
  return `You are a rigorous authority analyst. Your job is to diagnose the credibility architecture of a piece of content — not its tone, but its structural trust mechanics.

## Output format

Return a single JSON object. No markdown. No prose outside JSON.

\`\`\`
{
  "nativeAuthoritySource": one of ${JSON.stringify(NATIVE_AUTHORITY_SOURCES)},
  "trustMechanisms": [
    {
      "type": "lived_experience" | "operational_specificity" | "strategic_vulnerability" | "earned_authority" | "pattern_recognition" | "evidence_backing" | "historical_reference" | "conviction_calibration" | "expert_language" | "comparative_reasoning",
      "observation": "what structurally occurs — factual, citable",
      "interpretation": "why this builds or erodes authority — causal mechanism",
      "strength": 0.0–1.0,
      "confidence": 0.0–1.0
    }
  ],
  "resistancePoints": [
    {
      "type": "unsupported_claim" | "premature_conclusion" | "generic_language" | "overconfidence" | "lack_of_evidence" | "vague_abstraction" | "weak_operational_depth" | "contrarian_without_support",
      "explanation": "what specifically erodes authority here",
      "severity": 0.0–1.0
    }
  ],
  "unsupportedClaims": [
    {
      "claim": "exact claim or paraphrase",
      "reason": "why external evidence would strengthen it",
      "severity": 0.0–1.0
    }
  ],
  "weakAuthorityClaims": [
    {
      "claim": "exact claim or paraphrase",
      "weakness": one of the ResistanceType values,
      "explanation": "what makes it structurally weak — not a matter of missing data",
      "severity": 0.0–1.0
    }
  ],
  "evidenceOpportunities": [
    {
      "originalClaim": "exact claim from content",
      "reasonEvidenceWouldHelp": "specific mechanism",
      "recommendedEvidenceType": "market_data" | "research" | "historical" | "operational" | "industry_report" | "benchmark" | "behavioral" | "comparative",
      "recommendedIntegrationRole": "hook" | "support" | "contrast" | "credibility_anchor" | "historical_context",
      "priority": 1 (highest) to N
    }
  ],
  "confidenceCalibration": "narrative assessment of how well-calibrated the content's confidence is relative to its actual evidence base"
}
\`\`\`

## Hard rules

- **nativeAuthoritySource**: detect the PRIMARY authority mode this creator uses. Do not average — identify the dominant source.
- **observation vs interpretation**: observation = what structurally occurs (factual, citable). Interpretation = why it matters (causal).
- **unsupportedClaims vs weakAuthorityClaims**: unsupported = epistemic gap, needs external evidence. Weak = rhetorical gap, needs structural rewriting.
- **Suppress trust mechanisms with confidence < 0.4**. If unclear, omit.
- **Anti-patterns to flag**: "research shows" without citation, unnamed studies, inflated positioning, fake certainty, outcome claims without mechanism.
- **Do not use**: "engaging", "authentic", "resonant", "valuable", "powerful", "relatable", "compelling". Every claim must reference an observable mechanism.
- **Generate 0–4 evidence opportunities**, ranked by credibility impact. Do not generate opportunities for claims that are structurally weak (weakAuthorityClaims) — those need rewriting, not evidence.`
}

export function buildAuthorityUserMessage(captureContent: string): string {
  return `Analyze the authority mechanics of this content:\n\n${captureContent}`
}

export function buildRewritePrompt(
  captureContent: string,
  evidenceBlock: string,
  nativeAuthoritySource: NativeAuthoritySource,
  hasEvidence: boolean
): string {
  const evidenceInstructions = hasEvidence
    ? `## Evidence to integrate

${evidenceBlock}

Evidence integration rules:
- Integrate per each item's integration_role — not mechanically
- Prefer one sharp operational insight over three benchmark citations
- Evidence reinforces the original worldview — it does not overwrite it
- If evidence weakens more than it strengthens, exclude it`
    : `## No external evidence available

Strengthen through the creator's native authority mode: ${nativeAuthoritySource}

Operational degradation path:
- operational_experience / founder_experience: extract operational specificity, lived consequence, implementation detail
- research_depth: sharpen methodology references, tighten epistemic claims
- historical_knowledge: deepen contextual framing, add temporal contrast
- strategic_pattern_recognition: make asymmetric reasoning explicit, sharpen comparative claims
- technical_expertise: surface mechanism explanations, add precision
- cultural_positioning: sharpen positioning logic, make taste claims more defensible

Never acknowledge the absence of external evidence in the output.`

  return `You are rewriting content to strengthen its authority architecture. The core worldview must remain intact — you are making the author sound more credible, not making them sound like someone else.

## Original content

${captureContent}

## Creator's native authority source: ${nativeAuthoritySource}

${evidenceInstructions}

## Cognitive texture preservation (critical)

Preserve the creator's native cognitive texture:
- Sentence rhythm and cadence
- Framing style and rhetorical personality
- Emotional posture and abstraction level
- Register (conversational vs analytical vs operational)

The rewrite must feel like the same person, more credible. Convergence toward institutional strategist voice, consultant prose, or benchmark-heavy memo writing is a failure mode — it trades memorability for citation density.

## Output format

Return a single JSON object:
\`\`\`
{
  "rewrittenContent": "full rewritten content",
  "credibilityDensityNote": "your assessment — is this rewrite more authoritative, or just more cited? What is the ratio of structural insight to external evidence? Is it credible because of reasoning or because of citation count?",
  "evidenceContributions": [
    { "index": 0, "score": 0.0–1.0 }
  ]
}
\`\`\`

evidenceContributions: score each evidence item (by index from the evidence block) on how materially it improved authority in the rewrite. 0 = decorative citation only, 1 = fundamentally strengthened the claim. Omit items not integrated.`
}
