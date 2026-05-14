'use client'

import { useState, useEffect, useCallback } from 'react'
import { tokens } from '@/lib/feed/tokens'
import { FeedTabs } from './FeedTabs'
import { OnboardingModal } from './OnboardingModal'
import { SignalCard } from './SignalCard'
import { ConceptCard } from './ConceptCard'
import { ServiceCard } from './ServiceCard'
import { CompetitorCard } from './CompetitorCard'
import type { FeedTab, SignalCard as SignalCardType, CompetitorCard as CompetitorCardType } from '@/types/feed'

interface SignalFeedProps {
  userId: string
  initialTab?: FeedTab
}

type CardCache = Partial<Record<FeedTab, SignalCardType[]>>
type CompetitorCache = CompetitorCardType[] | null

export function SignalFeed({ userId, initialTab = 'news' }: SignalFeedProps) {
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
        const data: CompetitorCardType[] = await res.json()
        setCompetitorCache(data)
      } else {
        const res = await fetch(`/api/feed?tab=${tab}`)
        if (!res.ok) throw new Error('Failed to load signals')
        const data: SignalCardType[] = await res.json()
        setCardCache(prev => ({ ...prev, [tab]: data }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load signals')
    } finally {
      setLoading(false)
    }
  }, [])

  // Load initial tab on mount
  useEffect(() => {
    fetchTab(initialTab)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const activeCards = activeTab === 'competitors' ? null : cardCache[activeTab]
  const activeCompetitors = activeTab === 'competitors' ? competitorCache : null

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto', padding: '24px 16px' }}>
      <OnboardingModal userId={userId} />

      {/* Page header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
          Signal Feed
        </h1>
        <p style={{ fontSize: '13px', color: tokens.colors.sectionHeaderColor, margin: 0 }}>
          Emerging narratives ranked by opportunity. Updated from GDELT Cloud.
        </p>
      </div>

      <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Loading state */}
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

      {/* Error state */}
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

      {/* Competitors panel */}
      {!loading && !error && activeTab === 'competitors' && (
        <>
          {!activeCompetitors || activeCompetitors.length === 0 ? (
            <EmptyState tab="competitors" />
          ) : (
            activeCompetitors.map(card => (
              <CompetitorCard key={card.id} competitor={card} userId={userId} />
            ))
          )}
        </>
      )}

      {/* Signal cards panel */}
      {!loading && !error && activeTab !== 'competitors' && (
        <>
          {!activeCards || activeCards.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            activeCards.map(card => {
              if (activeTab === 'concepts') {
                return <ConceptCard key={card.id} card={card} userId={userId} onDismiss={handleDismiss} />
              }
              if (activeTab === 'services') {
                return <ServiceCard key={card.id} card={card} userId={userId} onDismiss={handleDismiss} />
              }
              return <SignalCard key={card.id} card={card} userId={userId} onDismiss={handleDismiss} />
            })
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: FeedTab }) {
  const messages: Record<FeedTab, { heading: string; body: string }> = {
    news: {
      heading: 'No signals yet',
      body: 'GDELT is being queried for emerging narratives in your niche. Check back soon.',
    },
    services: {
      heading: 'No service matches yet',
      body: 'Add your focus areas in Settings to match signals to what you offer.',
    },
    concepts: {
      heading: 'No emerging frameworks yet',
      body: 'Concept clusters are identified as GDELT entity co-occurrence patterns accumulate.',
    },
    competitors: {
      heading: 'No competitive signals yet',
      body: 'Add competitors in Settings to track their coverage and find unclaimed territory.',
    },
  }

  const { heading, body } = messages[tab]

  return (
    <div style={{
      textAlign: 'center',
      padding: '60px 24px',
      color: '#6b7280',
    }}>
      <p style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>{heading}</p>
      <p style={{ fontSize: '13px', lineHeight: '1.6', maxWidth: '320px', margin: '0 auto' }}>{body}</p>
    </div>
  )
}
