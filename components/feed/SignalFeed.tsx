'use client'

import { useState, useEffect, useCallback } from 'react'
import { tokens } from '@/lib/feed/tokens'
import { FeedTabs } from './FeedTabs'
import { FeedStatusPill } from './FeedStatusPill'
import { OnboardingFlow } from './OnboardingFlow'
import { SignalFeedGenerating } from './SignalFeedGenerating'
import { SignalCard } from './SignalCard'
import { ConceptCard } from './ConceptCard'
import { ServiceCard } from './ServiceCard'
import { CompetitorCard } from './CompetitorCard'
import { EditorialBriefingCard } from './EditorialBriefingCard'
import { ExampleSignalCard } from './ExampleSignalCard'
import type {
  FeedTab,
  FeedPhase,
  SignalCard as SignalCardType,
  CompetitorCard as CompetitorCardType,
  OnboardingPayload,
} from '@/types/feed'

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
type CompetitorCache = CompetitorCardType[] | null

export function SignalFeed({
  userId,
  initialTab = 'news',
  onboardingComplete,
  userDisplayName,
}: SignalFeedProps) {
  const [feedPhase, setFeedPhase] = useState<FeedPhase>(
    onboardingComplete ? 'feed' : 'onboarding'
  )
  const [activeTab, setActiveTab] = useState<FeedTab>(initialTab)
  const [cardCache, setCardCache] = useState<CardCache>({})
  const [competitorCache, setCompetitorCache] = useState<CompetitorCache>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTab = useCallback(async (tab: FeedTab) => {
    setLoading(true)
    setError(null)
    try {
      if (tab === 'competitors') {
        const res = await fetch('/api/competitors/signals')
        if (!res.ok) throw new Error('Failed to load competitive landscape')
        const { competitors } = await res.json()
        setCompetitorCache(competitors ?? [])
      } else {
        const res = await fetch(`/api/feed?tab=${tab}`)
        if (!res.ok) throw new Error('Failed to load signals')
        const { cards } = await res.json()
        setCardCache(prev => ({ ...prev, [tab]: cards ?? [] }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial tab when in feed phase
  useEffect(() => {
    if (feedPhase === 'feed') {
      fetchTab(initialTab)
    }
  }, [feedPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab)
    const alreadyCached = tab === 'competitors'
      ? competitorCache !== null
      : cardCache[tab] !== undefined
    if (!alreadyCached) {
      fetchTab(tab)
    }
  }, [cardCache, competitorCache, fetchTab])

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
  const activeCards = activeTab === 'competitors' ? null : cardCache[activeTab]
  const activeCompetitors = activeTab === 'competitors' ? competitorCache : null
  const isEmpty = activeTab === 'competitors'
    ? !activeCompetitors || activeCompetitors.length === 0
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

        <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Loading */}
        {loading && (
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

        {/* Error */}
        {!loading && error && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
            <button
              onClick={() => fetchTab(activeTab)}
              style={{
                padding: '7px 16px',
                fontSize: '13px',
                backgroundColor: tokens.colors.generateButtonBg,
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

        {/* Empty state — editorial default */}
        {!loading && !error && isEmpty && (
          <>
            <EditorialBriefingCard />
            {EXAMPLE_TOPICS.map((topic, i) => (
              <ExampleSignalCard key={topic} topic={topic} index={i} />
            ))}
            <HowCloutThinksPanel />
          </>
        )}

        {/* Competitor cards */}
        {!loading && !error && !isEmpty && activeTab === 'competitors' && (
          activeCompetitors!.map((card, index) => (
            <div
              key={card.id}
              style={{
                animation: 'feedCardEnter 0.35s ease both',
                animationDelay: `${index * 60}ms`,
              }}
            >
              <CompetitorCard competitor={card} userId={userId} />
            </div>
          ))
        )}

        {/* Signal cards */}
        {!loading && !error && !isEmpty && activeTab !== 'competitors' && (
          activeCards!.map((card, index) => (
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
              {activeTab === 'services' && (
                <ServiceCard card={card} userId={userId} onDismiss={handleDismiss} />
              )}
              {activeTab === 'news' && (
                <SignalCard card={card} userId={userId} onDismiss={handleDismiss} />
              )}
            </div>
          ))
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
