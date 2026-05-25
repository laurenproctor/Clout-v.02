import type { NewsdataArticle } from './client'
import type { CardTone, FeedTab } from '@/types/feed'

export function newsdataSentimentToTone(
  sentiment: NewsdataArticle['sentiment']
): CardTone {
  if (sentiment === 'positive' || sentiment === 'negative') return sentiment
  return 'neutral'
}

export function computeMomentumFromAge(pubDate: string): {
  barWidth: number
  pct: string
} {
  const publishedMs = new Date(pubDate).getTime()
  const ageHours = (Date.now() - publishedMs) / (1000 * 60 * 60)

  let barWidth: number
  if (ageHours < 24) {
    barWidth = Math.floor(60 + Math.random() * 30) // 60–90
  } else if (ageHours < 48) {
    barWidth = Math.floor(30 + Math.random() * 30) // 30–60
  } else {
    barWidth = Math.floor(5 + Math.random() * 25)  // 5–30
  }

  return { barWidth, pct: `+${barWidth}%` }
}

export interface SignalInsert {
  external_id: string
  source: 'newsdata'
  title: string
  source_url: string
  published_at: string | null
  tone: CardTone
  coverage_48h_pct: number
}

export interface SignalCardInsert {
  tab: FeedTab
  title: string
  tone: CardTone
  momentum_pct: string
  momentum_bar_width: number
  tags: string[]
  gdelt_score: null
  gdelt_score_label: string
  is_trending: boolean
  timing_classification: 'evergreen' | 'publish_now'
  concept_surfaced_via: string | null
  why_now: string | null
  matched_service: string | null
  competitor_id: string | null
}

export function articleToSignalInsert(
  article: NewsdataArticle
): SignalInsert {
  const momentum = computeMomentumFromAge(article.pubDate)
  return {
    external_id: article.article_id,
    source: 'newsdata',
    title: article.title,
    source_url: article.link,
    published_at: article.pubDate ? new Date(article.pubDate).toISOString() : null,
    tone: newsdataSentimentToTone(article.sentiment),
    coverage_48h_pct: momentum.barWidth,
  }
}

interface CardOverrides {
  service?: string
  competitorId?: string
  conceptDescription?: string
}

export function signalToCardInsert(
  signal: SignalInsert & { id: string },
  tab: FeedTab,
  queryTopic: string,
  articleKeywords: string[] | null,
  overrides: CardOverrides = {}
): SignalCardInsert {
  const momentum = computeMomentumFromAge(
    signal.published_at ?? new Date().toISOString()
  )

  // Deduplicate and cap tags
  const rawTags = [queryTopic, ...(articleKeywords ?? [])].map(t =>
    t.toLowerCase().trim()
  )
  const tags = [...new Set(rawTags)].slice(0, 5)

  const isTrending = momentum.barWidth >= 50
  const timingClassification =
    momentum.barWidth >= 70 ? 'publish_now' : 'evergreen'

  const gdeltScoreLabel = isTrending
    ? 'High velocity'
    : momentum.barWidth >= 30
    ? 'Rising'
    : 'Stable'

  return {
    tab,
    title: signal.title,
    tone: signal.tone,
    momentum_pct: momentum.pct,
    momentum_bar_width: momentum.barWidth,
    tags,
    gdelt_score: null,
    gdelt_score_label: gdeltScoreLabel,
    is_trending: isTrending,
    timing_classification: timingClassification,
    concept_surfaced_via: tab === 'concepts' ? 'newsdata' : null,
    why_now:
      tab === 'concepts' && overrides.conceptDescription
        ? overrides.conceptDescription.slice(0, 120)
        : null,
    matched_service: overrides.service ?? null,
    competitor_id: overrides.competitorId ?? null,
  }
}
