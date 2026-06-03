'use client'

import { useState } from 'react'
import type { KnowledgeTopic } from '@/types/feed'
import { KnowledgeTopicCard } from './KnowledgeTopicCard'
import { KnowledgeDebateCard } from './KnowledgeDebateCard'

// TODO: Future — cross-link to Industry Signals:
//   Topics with related_signal_topics[] should surface a "Related Signals" row
//   linking back to active signal_cards in the news tab.
// TODO: Future — cross-link to Website Intelligence:
//   Topics that match website assets' matched_service should show a
//   "Website Assets Found" row with asset count and a link to Website Intelligence.
// TODO: Future — workspace-specific knowledge generation using:
//   workspace_feed_settings.services, content_topics, website assets,
//   captured content, and published outputs to derive industry-relevant topics.

const FILTERS = ['All', 'Foundational', 'Advanced', 'Emerging', 'Debates', 'Thinkers']

const FILTER_TO_CATEGORY: Record<string, KnowledgeTopic['category'] | null> = {
  All:         null,
  Foundational: 'foundational',
  Advanced:    'advanced',
  Emerging:    'emerging',
  Debates:     'debate',
  Thinkers:    'thinker',
}

interface KnowledgeSignalsFeedProps {
  topics: KnowledgeTopic[]
  loading: boolean
  error: string | null
  workspaceSlug: string
  onRetry: () => void
}

export function KnowledgeSignalsFeed({
  topics,
  loading,
  error,
  workspaceSlug,
  onRetry,
}: KnowledgeSignalsFeedProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  const categoryFilter = FILTER_TO_CATEGORY[activeFilter] ?? null

  const filtered = topics.filter(t => {
    if (categoryFilter && t.category !== categoryFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        t.title.toLowerCase().includes(q) ||
        t.frameworks.some(f => f.toLowerCase().includes(q)) ||
        t.thinkers.some(tk => tk.toLowerCase().includes(q)) ||
        t.summary.toLowerCase().includes(q)
      )
    }
    return true
  })

  const isFiltered = activeFilter !== 'All' || search.length > 0

  // Featured: highest score >= 90, non-debate, non-thinker (unless filter active)
  const featured = !isFiltered
    ? filtered.find(t => t.importance_score >= 90 && t.category !== 'debate')
    : null

  const foundational = filtered.filter(t => t.category === 'foundational' && t !== featured)
  const advanced = filtered.filter(t => t.category === 'advanced')
  const emerging = filtered.filter(t => t.category === 'emerging')
  const debates = filtered.filter(t => t.category === 'debate')
  const thinkers = filtered.filter(t => t.category === 'thinker' && t !== featured)

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        Loading knowledge signals…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        <button
          onClick={onRetry}
          style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, backgroundColor: '#1a1560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
          Knowledge Signals
        </h2>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
          Foundational concepts, frameworks, and debates for your field.
        </p>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', marginBottom: '10px' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            style={{
              padding: '4px 12px', fontSize: '12px', fontWeight: 500,
              borderRadius: '20px', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              backgroundColor: activeFilter === f ? '#1a1560' : '#f3f4f6',
              color: activeFilter === f ? '#fff' : '#374151',
              transition: 'background-color 0.1s, color 0.1s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search topics, frameworks, thinkers…"
        style={{
          width: '100%', padding: '8px 12px', fontSize: '13px',
          border: '1px solid #e5e7eb', borderRadius: '6px', marginBottom: '16px',
          outline: 'none', boxSizing: 'border-box', color: '#111827', backgroundColor: '#fff',
        }}
      />

      {filtered.length === 0 ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
          No topics found.
        </div>
      ) : isFiltered ? (
        /* Filtered flat list */
        <div>
          {filtered.map(t =>
            t.category === 'debate'
              ? <KnowledgeDebateCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />
              : <KnowledgeTopicCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />
          )}
        </div>
      ) : (
        /* Grouped sections with featured */
        <>
          {featured && (
            <KnowledgeTopicCard topic={featured} workspaceSlug={workspaceSlug} featured />
          )}

          {foundational.length > 0 && (
            <Section label="Foundational">
              {foundational.map(t => <KnowledgeTopicCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />)}
            </Section>
          )}

          {advanced.length > 0 && (
            <Section label="Advanced">
              {advanced.map(t => <KnowledgeTopicCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />)}
            </Section>
          )}

          {emerging.length > 0 && (
            <Section label="Emerging">
              {emerging.map(t => <KnowledgeTopicCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />)}
            </Section>
          )}

          {debates.length > 0 && (
            <Section label="Debates">
              {debates.map(t => <KnowledgeDebateCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />)}
            </Section>
          )}

          {thinkers.length > 0 && (
            <Section label="Thinkers">
              {thinkers.map(t => <KnowledgeTopicCard key={t.id} topic={t} workspaceSlug={workspaceSlug} />)}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{
        fontSize: '11px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.6px', color: '#9ca3af', margin: '0 0 10px',
      }}>
        {label}
      </h3>
      {children}
    </div>
  )
}
