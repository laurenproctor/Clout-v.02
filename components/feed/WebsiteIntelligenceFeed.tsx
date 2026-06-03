'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { WebsiteOpportunity, WebsiteContentGap } from '@/types/feed'
import { WebsiteFeaturedCard } from './WebsiteFeaturedCard'
import { WebsiteOpportunityCard } from './WebsiteOpportunityCard'
import { WebsiteContentGapCard } from './WebsiteContentGapCard'
import { WebsiteFilters } from './WebsiteFilters'

// TODO: Future — surface related Knowledge Signals on website opportunities.
// When opportunity.matched_service matches a KnowledgeTopic, show
// a "Related Knowledge" row beneath the opportunity card.

// TODO: Future feed organization — group remaining cards by level:
// High Opportunity → Medium Opportunity → Emerging
// instead of flat sorted list

// Source chip label → source_type value mapping
const CHIP_TO_SOURCE: Record<string, string> = {
  Homepage:        'Homepage',
  Services:        'Service Page',
  'Case Studies':  'Case Study',
  Testimonials:    'Testimonials',
  Reports:         'Research Report',
  'Blog Posts':    'Blog Post',
  Resources:       'Resource',
  'Founder Stories': 'Founder Story',
}

interface WebsiteIntelligenceFeedProps {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  loading: boolean
  error: string | null
  workspaceSlug: string
  websiteUrl: string | null
  onRetry: () => void
}

export function WebsiteIntelligenceFeed({
  items,
  gaps,
  loading,
  error,
  workspaceSlug,
  websiteUrl,
  onRetry,
}: WebsiteIntelligenceFeedProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const showOnlyGaps = activeFilter === 'Content Gaps'
  const sourceFilter = CHIP_TO_SOURCE[activeFilter] ?? null

  const filteredItems = items.filter(item => {
    if (showOnlyGaps) return false
    if (sourceFilter && item.source_type !== sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const filteredGaps = gaps.filter(gap => {
    if (!showOnlyGaps && activeFilter !== 'All' && sourceFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        gap.headline.toLowerCase().includes(q) ||
        gap.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  const featured = filteredItems[0] ?? null
  const rest = filteredItems.slice(1)

  if (!websiteUrl && !loading) {
    return (
      <div style={{ padding: '64px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: '#f3f4f6',
          marginBottom: '20px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
          No website connected
        </p>
        <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '380px', margin: '0 auto 24px', lineHeight: '1.6' }}>
          Connect your website URL and we&apos;ll analyze your existing assets to surface high-impact content opportunities.
        </p>
        <Link
          href={`/${workspaceSlug}/settings/feed`}
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: 'var(--workspace-accent, #1a1560)',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          Analyze Website
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        Analyzing your website…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        <button
          onClick={onRetry}
          style={{
            padding: '6px 16px',
            fontSize: '13px',
            fontWeight: 600,
            backgroundColor: '#1a1560',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  const isEmpty = filteredItems.length === 0 && filteredGaps.length === 0

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            Website Intelligence
          </h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
            Scored content opportunities from your existing website assets
          </p>
        </div>
        <button
          onClick={() => {
            // stub — future: trigger re-analysis
            alert('Analysis refresh will be available once your website is connected.')
          }}
          style={{
            padding: '5px 12px',
            fontSize: '12px',
            fontWeight: 500,
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Refresh Analysis
        </button>
      </div>

      {/* Filters */}
      <WebsiteFilters
        search={search}
        activeFilter={activeFilter}
        onSearchChange={setSearch}
        onFilterChange={setActiveFilter}
      />

      {isEmpty ? (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
            No opportunities found yet.
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', maxWidth: '360px', margin: '0 auto 16px' }}>
            Connect your website URL and we'll analyze your existing assets to surface high-impact content opportunities.
          </p>
          <button
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--workspace-accent, #1a1560)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Analyze Website
          </button>
        </div>
      ) : (
        <>
          {/* Featured card */}
          {featured && !showOnlyGaps && (
            <WebsiteFeaturedCard opportunity={featured} workspaceSlug={workspaceSlug} />
          )}

          {/* Content gaps section */}
          {filteredGaps.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#92400e',
                margin: '0 0 10px',
              }}>
                Content Gaps
              </h3>
              {filteredGaps.map(gap => (
                <WebsiteContentGapCard key={gap.id} gap={gap} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          )}

          {/* Remaining standard cards */}
          {rest.length > 0 && (
            <div>
              {!showOnlyGaps && (
                <h3 style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#9ca3af',
                  margin: '0 0 10px',
                }}>
                  More Opportunities
                </h3>
              )}
              {rest.map(opp => (
                <WebsiteOpportunityCard key={opp.id} opportunity={opp} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
