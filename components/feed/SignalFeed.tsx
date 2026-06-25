'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { tokens } from '@/lib/feed/tokens'
import { FeedTabs } from './FeedTabs'
import { FeedStatusPill } from './FeedStatusPill'
import { OnboardingFlow } from './OnboardingFlow'
import { SignalFeedGenerating } from './SignalFeedGenerating'
import { SignalCard } from './SignalCard'
import { ConceptCard } from './ConceptCard'
import { CompetitorIntelligenceFeed } from './CompetitorIntelligenceFeed'
import { WebsiteIntelligenceFeed } from './WebsiteIntelligenceFeed'
import { KnowledgeSignalsFeed } from './KnowledgeSignalsFeed'
import { EditorialBriefingCard } from './EditorialBriefingCard'
import { ExampleSignalCard } from './ExampleSignalCard'
import type {
  FeedTab,
  FeedPhase,
  FeedStats,
  SignalCard as SignalCardType,
  OnboardingPayload,
  WebsiteOpportunity,
  WebsiteContentGap,
  KnowledgeTopic,
} from '@/types/feed'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'

// Cards revealed per "Show 10 more" click, and the batch revealed after a fetch.
const PAGE_SIZE = 10

const EXAMPLE_TOPICS = [
  'AI retailers begin replacing recommendation systems with intent prediction models',
  'The rise of synthetic operational memory in enterprise AI systems',
  'No major healthcare AI vendor has addressed emotional inference regulation',
]

const HOW_CHAIN = [
  { step: '01', title: 'Signal Intelligence',   desc: 'GDELT monitors global media in real time.' },
  { step: '02', title: 'Visibility Engine',      desc: 'Scores signals by velocity, coverage gaps, and niche fit.' },
  { step: '03', title: 'Editorial Perspective',  desc: 'Maps signals to your voice and drafts differentiated angles.' },
  { step: '04', title: 'Authority Accumulation', desc: 'Consistent presence builds compounding recognition.' },
]

interface SignalFeedProps {
  userId: string
  initialTab?: FeedTab
  onboardingComplete: boolean
  userDisplayName: string
}

type CardCache = Partial<Record<FeedTab, SignalCardType[]>>
type WebsiteData = { items: WebsiteOpportunity[]; gaps: WebsiteContentGap[]; websiteUrl: string | null } | null
type KnowledgeData = { topics: KnowledgeTopic[] } | null

export function SignalFeed({
  userId,
  initialTab = 'news',
  onboardingComplete,
  userDisplayName,
}: SignalFeedProps) {
  const params = useParams()
  const workspaceSlug = typeof params.workspaceSlug === 'string' ? params.workspaceSlug : ''

  const [feedPhase, setFeedPhase] = useState<FeedPhase>(
    onboardingComplete ? 'feed' : 'onboarding'
  )
  const [activeTab, setActiveTab] = useState<FeedTab>(initialTab)
  const [cardCache, setCardCache] = useState<CardCache>({})
  const [competitorItems, setCompetitorItems] = useState<CompetitorContentItem[] | null>(null)
  const [websiteData, setWebsiteData] = useState<WebsiteData>(null)
  const [knowledgeData, setKnowledgeData] = useState<KnowledgeData>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedStats, setFeedStats] = useState<FeedStats | null>(null)
  // "Show 10 more / Find new signals" pagination for the list tabs (news/concepts).
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [moreNotice, setMoreNotice] = useState<string | null>(null)
  // Confirmation when arriving from a successful Settings refresh
  // (?refresh=added&n=N). Derived from the URL during render (no setState on
  // mount); auto-dismissed and the params stripped by the effect below.
  const searchParams = useSearchParams()
  const justRefreshed = searchParams.get('refresh') === 'added'
  const refreshedCount = Number(searchParams.get('n') ?? '0')
  const [noticeDismissed, setNoticeDismissed] = useState(false)
  const refreshNotice =
    justRefreshed && !noticeDismissed
      ? refreshedCount > 0
        ? `Added ${refreshedCount} new signal${refreshedCount === 1 ? '' : 's'} to your feed.`
        : 'Your feed was refreshed.'
      : null

  useEffect(() => {
    if (!justRefreshed) return
    const t = setTimeout(() => setNoticeDismissed(true), 6000)
    // Strip the params so a reload doesn't re-trigger the notice.
    const sp = new URLSearchParams(window.location.search)
    sp.delete('refresh')
    sp.delete('n')
    const qs = sp.toString()
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''))
    return () => clearTimeout(t)
  }, [justRefreshed])

  // Run the blog-aware analysis on the URL configured in /feed settings and
  // return data in the shape WebsiteIntelligenceFeed expects. Throws on failure
  // so the caller surfaces the error + Retry like any other tab load.
  const analyzeConfiguredWebsite = useCallback(async (websiteUrl: string): Promise<WebsiteData> => {
    const res = await fetch('/api/website-intelligence/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ website_url: websiteUrl }),
    })
    const text = await res.text()
    let data: { error?: string; items?: WebsiteOpportunity[]; gaps?: WebsiteContentGap[]; website_url?: string }
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      throw new Error(
        res.status === 504 || res.status === 502
          ? 'Your site has a lot of content and took too long to analyze. Try a more specific page in feed settings.'
          : `Analysis failed (HTTP ${res.status}).`,
      )
    }
    if (!res.ok || data.error) throw new Error(data.error ?? `Analysis failed (HTTP ${res.status}).`)
    return { items: data.items ?? [], gaps: data.gaps ?? [], websiteUrl: data.website_url ?? websiteUrl }
  }, [])

  const fetchTab = useCallback(async (tab: FeedTab, opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    setError(null)
    try {
      if (tab === 'competitors') {
        const res = await fetch('/api/competitors/content')
        if (!res.ok) throw new Error('Failed to load competitive intelligence')
        const { items } = await res.json()
        setCompetitorItems(items ?? [])
      } else if (tab === 'website') {
        const res = await fetch('/api/website-intelligence')
        if (!res.ok) throw new Error('Failed to load website intelligence')
        const data = await res.json()
        // First visit: the website is configured in /feed settings but has never
        // been analyzed. Auto-analyze that configured URL so the user sees posts
        // from their own site without having to paste a URL here.
        if (data.configured && data.website_url && !data.last_analyzed_at) {
          // Surface the configured URL up front so that if the auto-analyze
          // fails, the error state can pre-fill it in the retry input.
          setWebsiteData({ items: [], gaps: [], websiteUrl: data.website_url })
          const analyzed = await analyzeConfiguredWebsite(data.website_url)
          setWebsiteData(analyzed)
        } else {
          setWebsiteData({ items: data.items ?? [], gaps: data.gaps ?? [], websiteUrl: data.website_url ?? null })
        }
      } else if (tab === 'knowledge') {
        const res = await fetch('/api/knowledge-signals')
        if (!res.ok) throw new Error('Failed to load knowledge signals')
        const data = await res.json()
        setKnowledgeData({ topics: data.topics ?? [] })
      } else {
        const res = await fetch(`/api/feed?tab=${tab}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        })
        if (!res.ok) throw new Error('Failed to load signals')
        const { cards } = await res.json()
        setCardCache(prev => ({ ...prev, [tab]: cards ?? [] }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals')
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }, [analyzeConfiguredWebsite])

  // Load initial tab and stats when entering feed phase
  useEffect(() => {
    if (feedPhase === 'feed') {
      fetchTab(initialTab)
      fetch('/api/feed/stats')
        .then(res => res.ok ? res.json() : null)
        .then(data => { if (data) setFeedStats(data) })
        .catch(() => {})
    }
  }, [feedPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset pagination whenever the feed identity changes (tab or workspace), so a
  // new list always starts at one page and stale notices don't linger. Adjusting
  // state during render on an identity change is React's documented pattern
  // (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const feedIdentity = `${activeTab}|${workspaceSlug}`
  const [prevFeedIdentity, setPrevFeedIdentity] = useState(feedIdentity)
  if (feedIdentity !== prevFeedIdentity) {
    setPrevFeedIdentity(feedIdentity)
    setVisibleCount(PAGE_SIZE)
    setMoreNotice(null)
  }

  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab)
    const alreadyCached =
      tab === 'competitors' ? competitorItems !== null :
      tab === 'website'     ? websiteData !== null :
      tab === 'knowledge'   ? knowledgeData !== null :
      cardCache[tab] !== undefined
    if (!alreadyCached) {
      fetchTab(tab)
    }
  }, [cardCache, competitorItems, websiteData, knowledgeData, fetchTab])

  const handleDismiss = useCallback((cardId: string) => {
    setCardCache(prev => {
      const updated = { ...prev }
      for (const tab of Object.keys(updated) as FeedTab[]) {
        if (updated[tab]) {
          updated[tab] = updated[tab]!.filter(c => c.id !== cardId)
        }
      }
      return updated
    })
  }, [])

  // "Show 10 more" reveals already-loaded cards; once exhausted (news only), it
  // runs on-demand ingestion, reloads the tab, and surfaces any new cards.
  async function handleFetchMore() {
    const cards = cardCache[activeTab] ?? []

    // Reveal phase — more already-loaded cards remain.
    if (visibleCount < cards.length) {
      setMoreNotice(null)
      setVisibleCount(v => Math.min(v + PAGE_SIZE, cards.length))
      return
    }

    // Fetch phase — news only (concepts has no ingestion path; button hidden there).
    if (activeTab !== 'news' || fetchingMore) return
    setFetchingMore(true)
    setMoreNotice(null)
    try {
      const res = await fetch('/api/feed/refresh', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.ok) {
        setMoreNotice(data?.error ?? 'Couldn’t find new signals right now. Try again shortly.')
        return
      }
      await fetchTab(activeTab, { silent: true }) // reload without flashing the list
      setVisibleCount(v => v + PAGE_SIZE)         // tolerate overage; cap on next render
      if ((data.newCards ?? 0) === 0) {
        setMoreNotice('No new signals right now. Check back later.')
      }
    } catch {
      setMoreNotice('Couldn’t find new signals right now. Try again shortly.')
    } finally {
      setFetchingMore(false)
    }
  }

  async function handleOnboardingComplete(payload: OnboardingPayload) {
    setFeedPhase('generating')
    fetchTab(initialTab) // prefetch in background

    const minimumDelay = new Promise<void>(resolve => setTimeout(resolve, 2500))
    await Promise.all([
      fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {}),
      minimumDelay,
    ])

    setFeedPhase('feed')
  }

  // ── Phase: Onboarding ──────────────────────────────────────────────────────
  if (feedPhase === 'onboarding') {
    return (
      <OnboardingFlow
        userDisplayName={userDisplayName}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // ── Phase: Generating ─────────────────────────────────────────────────────
  if (feedPhase === 'generating') {
    return <SignalFeedGenerating />
  }

  // ── Phase: Feed ───────────────────────────────────────────────────────────
  const isManagedTab = activeTab === 'competitors' || activeTab === 'website' || activeTab === 'knowledge'
  const activeCards = isManagedTab ? null : cardCache[activeTab]
  const isEmpty = isManagedTab
    ? false  // competitors and website tabs handle their own empty states
    : !activeCards || activeCards.length === 0

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes feedCardEnter {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      ` }} />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '24px 16px' }}>

        {/* Page header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '20px',
          gap: '12px',
        }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
              Signal Intelligence
            </h1>
            <p style={{ fontSize: '13px', color: tokens.colors.sectionHeaderColor, margin: 0 }}>
              Emerging narratives ranked by asymmetric opportunity.
            </p>
          </div>
          <FeedStatusPill status="live" />
        </div>

        {refreshNotice && (
          <div style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: '6px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '13px',
          }}>
            {refreshNotice}
          </div>
        )}

        <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Loading — only for tabs that don't manage their own state */}
        {loading && !isManagedTab && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '200px',
            color: tokens.colors.sectionHeaderColor,
            fontSize: '14px',
          }}>
            Loading signals…
          </div>
        )}

        {/* Error — only for tabs that don't manage their own state */}
        {!loading && error && !isManagedTab && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
            <button
              onClick={() => fetchTab(activeTab)}
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                backgroundColor: 'var(--workspace-accent, #1a1560)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state — editorial default (only for tabs that don't manage their own state) */}
        {!loading && !error && isEmpty && !isManagedTab && (
          <>
            <EditorialBriefingCard stats={feedStats} />
            {EXAMPLE_TOPICS.map((topic, i) => (
              <ExampleSignalCard key={topic} topic={topic} index={i} />
            ))}
            <HowCloutThinksPanel />
          </>
        )}

        {/* Competitor Intelligence */}
        {activeTab === 'competitors' && (
          <CompetitorIntelligenceFeed
            items={competitorItems ?? []}
            loading={loading}
            error={error}
            onRetry={() => fetchTab('competitors')}
          />
        )}

        {/* Website Intelligence */}
        {activeTab === 'website' && (
          <WebsiteIntelligenceFeed
            items={websiteData?.items ?? []}
            gaps={websiteData?.gaps ?? []}
            loading={loading}
            error={error}
            workspaceSlug={workspaceSlug}
            websiteUrl={websiteData?.websiteUrl ?? null}
            onRetry={() => fetchTab('website')}
            onUrlSaved={(url, result) => {
              setError(null)
              setWebsiteData({ items: result.items, gaps: result.gaps, websiteUrl: url })
            }}
          />
        )}

        {/* Knowledge Signals */}
        {activeTab === 'knowledge' && (
          <KnowledgeSignalsFeed
            topics={knowledgeData?.topics ?? []}
            loading={loading}
            error={error}
            workspaceSlug={workspaceSlug}
            onRetry={() => fetchTab('knowledge')}
          />
        )}

        {/* Signal cards */}
        {!loading && !error && !isEmpty && !isManagedTab && (
          <>
            {activeCards!.slice(0, visibleCount).map((card, index) => (
              <div
                key={card.id}
                style={{
                  animation: 'feedCardEnter 0.35s ease both',
                  animationDelay: `${index * 60}ms`,
                }}
              >
                {activeTab === 'concepts' && (
                  <ConceptCard card={card} userId={userId} onDismiss={handleDismiss} />
                )}
                {activeTab === 'news' && (
                  <SignalCard card={card} userId={userId} onDismiss={handleDismiss} />
                )}
              </div>
            ))}

            {/* Show 10 more (reveal) → Find new signals (ingest, news only). Concepts
                has no ingestion path, so its button hides once all cards are shown. */}
            {(() => {
              const hasMoreLoaded = visibleCount < activeCards!.length
              if (activeTab === 'concepts' && !hasMoreLoaded) return null
              const label = fetchingMore
                ? 'Finding new signals…'
                : hasMoreLoaded
                  ? 'Show 10 more'
                  : 'Find new signals'
              return (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={handleFetchMore}
                    disabled={fetchingMore}
                    style={{
                      padding: '8px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      backgroundColor: 'var(--workspace-accent, #1a1560)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: fetchingMore ? 'default' : 'pointer',
                      opacity: fetchingMore ? 0.7 : 1,
                    }}
                  >
                    {label}
                  </button>
                  {moreNotice && (
                    <p style={{
                      marginTop: '10px',
                      fontSize: '12px',
                      color: tokens.colors.sectionHeaderColor,
                    }}>
                      {moreNotice}
                    </p>
                  )}
                </div>
              )
            })()}
          </>
        )}
      </div>
    </>
  )
}

function HowCloutThinksPanel() {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      backgroundColor: '#fff',
      marginTop: '24px',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: '#9ca3af',
        }}>
          How Clout Thinks
        </span>
      </div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
      }}>
        {HOW_CHAIN.map(({ step, title, desc }, i) => (
          <div
            key={step}
            style={{
              flex: '1 1 180px',
              padding: '16px',
              borderRight: i < HOW_CHAIN.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              color: '#9ca3af',
              marginBottom: '6px',
            }}>
              {step}
            </div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '4px',
            }}>
              {title}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.5',
            }}>
              {desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
