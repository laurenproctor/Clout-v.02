export interface ImportanceInput {
  published_at:      string | null
  metrics:           { likes?: number; comments?: number; shares?: number; views?: number }
  content:           string
  source_type:       string
  source_confidence: 'high' | 'medium' | 'low'
  topics:            string[]
}

export function calculateImportanceScore(input: ImportanceInput): number {
  const { published_at, metrics, content, source_type, source_confidence, topics } = input
  let score = 0

  // Recency (0–30 pts)
  if (published_at) {
    const ageDays = (Date.now() - new Date(published_at).getTime()) / 86_400_000
    if      (ageDays < 1)  score += 30
    else if (ageDays < 3)  score += 25
    else if (ageDays < 7)  score += 20
    else if (ageDays < 14) score += 12
    else if (ageDays < 30) score += 6
  }

  // Engagement (0–30 pts, logarithmic)
  const { likes = 0, comments = 0, shares = 0, views = 0 } = metrics
  const engRaw = likes + comments * 2 + shares * 3 + views * 0.01
  score += Math.min(30, Math.round(Math.log10(engRaw + 1) * 10))

  // Content depth (0–10 pts)
  const words = content.split(/\s+/).filter(Boolean).length
  if      (words > 300) score += 10
  else if (words > 100) score += 7
  else if (words > 30)  score += 4
  else if (words > 0)   score += 1

  // Source confidence (0–10 pts)
  score += { high: 10, medium: 6, low: 2 }[source_confidence] ?? 5

  // Platform quality (0–7 pts)
  const platformBonus: Record<string, number> = {
    blog: 7, youtube: 6, linkedin: 5, news: 5, twitter: 3, instagram: 2, facebook: 2,
  }
  score += platformBonus[source_type] ?? 0

  // Topic richness (0–5 pts)
  score += Math.min(5, topics.length * 1.5)

  // No topics = slight penalty
  if (topics.length === 0) score = Math.max(0, score - 2)

  return Math.min(100, Math.round(score))
}
