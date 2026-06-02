'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { tokens } from '@/lib/feed/tokens'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'

const SOURCE_LABEL: Record<string, string> = {
  blog:      'Blog',
  youtube:   'YouTube',
  twitter:   'X / Twitter',
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  news:      'News',
}

const SOURCE_COLOR: Record<string, string> = {
  blog:      '#374151',
  youtube:   '#FF0000',
  twitter:   '#000000',
  instagram: '#E1306C',
  linkedin:  '#0A66C2',
  facebook:  '#1877F2',
  news:      '#059669',
}

function SourceBadge({ sourceType }: { sourceType: string }) {
  const color = SOURCE_COLOR[sourceType] ?? '#6b7280'
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      padding:         '2px 7px',
      borderRadius:    '10px',
      fontSize:        '10px',
      fontWeight:      700,
      textTransform:   'uppercase',
      letterSpacing:   '0.6px',
      backgroundColor: `${color}15`,
      color,
      border:          `1px solid ${color}30`,
    }}>
      {SOURCE_LABEL[sourceType] ?? sourceType}
    </span>
  )
}

function ImportanceDot({ score }: { score: number }) {
  const color = score >= 70 ? '#059669' : score >= 40 ? '#d97706' : '#9ca3af'
  return (
    <span
      title={`Importance: ${score}`}
      style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }}
    />
  )
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const diff  = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function ContentCard({ item, index }: { item: CompetitorContentItem; index: number }) {
  const m = item.metrics ?? {}
  const metricParts: string[] = []
  if (m.likes    != null) metricParts.push(`${fmt(m.likes)} likes`)
  if (m.comments != null) metricParts.push(`${fmt(m.comments)} comments`)
  if (m.shares   != null) metricParts.push(`${fmt(m.shares)} shares`)
  if (m.views    != null) metricParts.push(`${fmt(m.views)} views`)

  const displayText = item.summary || item.content || item.title || ''

  return (
    <div style={{
      border:          `1px solid ${tokens.colors.cardBorder}`,
      borderRadius:    '8px',
      backgroundColor: '#fff',
      marginBottom:    '12px',
      overflow:        'hidden',
      animation:       'feedCardEnter 0.35s ease both',
      animationDelay:  `${index * 50}ms`,
    }}>
      {item.thumbnail_url && item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail_url}
            alt=""
            style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
          />
        </a>
      )}

      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${item.competitor_domain}&sz=16`}
            width={14} height={14} alt=""
            style={{ borderRadius: '2px', flexShrink: 0 }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>
            {item.competitor_domain}
          </span>
          <SourceBadge sourceType={item.source_type} />
          <ImportanceDot score={item.importance_score} />
          {item.published_at && (
            <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: 'auto' }}>
              {relativeTime(item.published_at)}
            </span>
          )}
        </div>

        {item.title && (
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#111827', margin: '0 0 4px', lineHeight: 1.4 }}>
            {item.title.slice(0, 120)}
          </p>
        )}

        {displayText && (
          <p style={{
            fontSize: '12px', color: '#6b7280', lineHeight: 1.5, margin: '0 0 10px',
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {displayText}
          </p>
        )}

        {item.topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {item.topics.map(t => (
              <span key={t} style={{
                fontSize: '10px', padding: '1px 6px', borderRadius: '8px',
                backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
          {metricParts.length > 0 && (
            <span style={{ fontSize: '11px', color: '#9ca3af' }}>
              {metricParts.join(' · ')}
            </span>
          )}
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '11px', fontWeight: 600, color: '#4f46e5', textDecoration: 'none', marginLeft: 'auto' }}
            >
              View →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  items:   CompetitorContentItem[]
  loading: boolean
  error:   string | null
  onRetry: () => void
}

export function CompetitorIntelligenceFeed({ items, loading, error, onRetry }: Props) {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>()
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', color: '#9ca3af', fontSize: '14px' }}>
        Loading competitor intelligence…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <p style={{ color: '#991b1b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        <button
          onClick={onRetry}
          style={{ padding: '7px 16px', fontSize: '13px', backgroundColor: '#1a1560', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
          No competitor content yet. Add competitors in{' '}
          <Link href={`/${workspaceSlug}/settings/feed`} style={{ color: '#4f46e5', textDecoration: 'none' }}>Signal Feed settings</Link>
          {' '}— content will appear after the next sync.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '12px' }}>
        <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9ca3af' }}>
          Competitor Intelligence · {items.length} items
        </span>
      </div>
      {items.map((item, index) => (
        <ContentCard key={item.id} item={item} index={index} />
      ))}
    </div>
  )
}
