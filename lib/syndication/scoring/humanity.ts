export interface HumanityScoreResult {
  score: number     // 0–100. Directional heuristic, not an authoritative gate.
  flags: string[]   // Human-readable guidance for the writer
}

const POLISHED_TRANSITIONS = [
  'it is worth noting', "it's worth noting", 'in conclusion', 'furthermore',
  'moreover', 'additionally', 'in summary', 'to summarize', 'as a result',
  'consequently', 'therefore', 'thus', "in today's", 'in this day and age',
  'in the fast-paced', 'needless to say', 'it goes without saying',
  'last but not least', 'this is a reminder that', 'at the end of the day',
]

const CONTRACTION_RE = /\b(I'm|I've|I'd|I'll|don't|can't|won't|isn't|aren't|we're|they're|it's|that's|there's|you're|he's|she's|who's|what's|let's|didn't|wasn't|weren't|couldn't|shouldn't|wouldn't|haven't|hasn't|hadn't)\b/gi

// Regex-based heuristics. Keep implementation lean — this is a prompt-shaping
// signal for writers, not a deterministic quality gate.
export function scoreHumanity(text: string): HumanityScoreResult {
  const flags: string[] = []
  let score = 100

  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean)
  if (sentences.length === 0) return { score: 50, flags: [] }

  // Sentence length variance — high variance = more human pacing
  const lengths = sentences.map(s => s.split(/\s+/).length)
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((acc, l) => acc + (l - avgLen) ** 2, 0) / lengths.length
  const cv = avgLen > 0 ? Math.sqrt(variance) / avgLen : 0
  if (cv < 0.2 && sentences.length > 3) {
    score -= 15
    flags.push('monotone sentence rhythm')
  }

  // Contraction rate — some contractions signal natural register
  const wordCount = text.split(/\s+/).length
  const contractions = (text.match(CONTRACTION_RE) ?? []).length
  if (contractions === 0 && wordCount > 40) {
    score -= 10
    flags.push('no contractions detected')
  }

  // Polished transition phrases
  const lower = text.toLowerCase()
  const transitionHits = POLISHED_TRANSITIONS.filter(p => lower.includes(p)).length
  if (transitionHits >= 2) {
    score -= 15
    flags.push('polished transition phrases')
  } else if (transitionHits === 1) {
    score -= 7
  }

  // Parallel sentence openers — heuristic for templated AI cadence
  const starters = sentences.map(s => s.split(/\s+/).slice(0, 2).join(' ').toLowerCase())
  const counts: Record<string, number> = {}
  for (const s of starters) counts[s] = (counts[s] ?? 0) + 1
  const maxRepeat = Math.max(...Object.values(counts))
  if (maxRepeat >= 3) {
    score -= 12
    flags.push('high parallel structure')
  }

  // Specificity — numbers or proper nouns are proxy for concrete thinking
  if (!/\b\d+/.test(text) && !/\b[A-Z][a-z]{2,}/.test(text) && wordCount > 30) {
    score -= 8
    flags.push('low specificity')
  }

  return { score: Math.max(0, Math.min(100, score)), flags }
}
