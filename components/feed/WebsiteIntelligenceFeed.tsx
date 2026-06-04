'use client'

import { useState } from 'react'
import type { WebsiteOpportunity, WebsiteContentGap } from '@/types/feed'
import { WebsiteFeaturedCard } from './WebsiteFeaturedCard'
import { WebsiteOpportunityCard } from './WebsiteOpportunityCard'
import { WebsiteContentGapCard } from './WebsiteContentGapCard'
import { WebsiteFilters } from './WebsiteFilters'

// TODO: Future — surface related Knowledge Signals on website opportunities.
// TODO: Future feed organization — group remaining cards by level: High → Medium → Emerging

const CHIP_TO_SOURCE: Record<string, string> = {
  Homepage:          'Homepage',
  Services:          'Service Page',
  'Case Studies':    'Case Study',
  Testimonials:      'Testimonials',
  Reports:           'Research Report',
  'Blog Posts':      'Blog Post',
  Resources:         'Resource',
  'Founder Stories': 'Founder Story',
}

interface AnalyzeResult {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  websiteUrl: string
}

interface WebsiteIntelligenceFeedProps {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  loading: boolean
  error: string | null
  workspaceSlug: string
  websiteUrl: string | null
  onRetry: () => void
  onUrlSaved: (url: string, result: AnalyzeResult) => void
}

export function WebsiteIntelligenceFeed({
  items,
  gaps,
  loading,
  error,
  workspaceSlug,
  websiteUrl,
  onRetry,
  onUrlSaved,
}: WebsiteIntelligenceFeedProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [urlInput, setUrlInput] = useState(websiteUrl ?? '')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

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

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return

    let url = urlInput.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`

    setAnalyzing(true)
    setAnalyzeError(null)

    try {
      const res = await fetch('/api/website-intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: url }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Analysis failed')

      setShowUrlForm(false)
      onUrlSaved(url, {
        items: data.items ?? [],
        gaps: data.gaps ?? [],
        websiteUrl: url,
      })
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
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

  const isEmpty = !websiteUrl || (filteredItems.length === 0 && filteredGaps.length === 0)

  if (isEmpty || analyzing) {
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

        {analyzing ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Analyzing your website…
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px', margin: '0 auto', lineHeight: '1.6' }}>
              We&apos;re crawling your site and identifying content opportunities. This takes about 15–30 seconds.
            </p>
          </>
        ) : showUrlForm ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              Connect your website
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              Enter your website URL and we&apos;ll analyze your existing content to surface high-impact opportunities.
            </p>
            <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input
                  type="text"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://yourwebsite.com"
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    outline: 'none',
                    color: '#111827',
                  }}
                />
                <button
                  type="submit"
                  disabled={!urlInput.trim()}
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: urlInput.trim() ? 'var(--workspace-accent, #1a1560)' : '#e5e7eb',
                    color: urlInput.trim() ? '#fff' : '#9ca3af',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: urlInput.trim() ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Analyze
                </button>
              </div>
              {analyzeError && (
                <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{analyzeError}</p>
              )}
              <button
                type="button"
                onClick={() => { setShowUrlForm(false); setAnalyzeError(null) }}
                style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Cancel
              </button>
            </form>
          </>
        ) : (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>
              No opportunities found yet.
            </p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '380px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              Connect your website URL and we&apos;ll analyze your existing assets to surface high-impact content opportunities.
            </p>
            <button
              onClick={() => { setShowUrlForm(true); setUrlInput(websiteUrl ?? '') }}
              style={{
                display: 'inline-block',
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
          </>
        )}
      </div>
    )
  }

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
          onClick={() => { setShowUrlForm(true); setUrlInput(websiteUrl ?? '') }}
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
          Re-analyze
        </button>
      </div>

      {/* Inline re-analyze form */}
      {showUrlForm && (
        <form onSubmit={handleAnalyze} style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://yourwebsite.com"
            autoFocus
            style={{
              flex: 1,
              padding: '7px 12px',
              fontSize: '13px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              outline: 'none',
              color: '#111827',
            }}
          />
          <button
            type="submit"
            disabled={!urlInput.trim() || analyzing}
            style={{
              padding: '7px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--workspace-accent, #1a1560)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
          <button
            type="button"
            onClick={() => { setShowUrlForm(false); setAnalyzeError(null) }}
            style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}
          >
            Cancel
          </button>
          {analyzeError && (
            <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{analyzeError}</p>
          )}
        </form>
      )}

      {/* Filters */}
      <WebsiteFilters
        search={search}
        activeFilter={activeFilter}
        onSearchChange={setSearch}
        onFilterChange={setActiveFilter}
      />

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
    </div>
  )
}
