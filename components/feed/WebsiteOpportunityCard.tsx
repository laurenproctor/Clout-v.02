'use client'

import { useRouter } from 'next/navigation'
import type { WebsiteOpportunity } from '@/types/feed'

const LEVEL_STYLES = {
  high:     { bg: '#dcfce7', color: '#166534', label: 'High Opportunity' },
  medium:   { bg: '#dbeafe', color: '#1e40af', label: 'Medium Opportunity' },
  emerging: { bg: '#fed7aa', color: '#9a3412', label: 'Emerging' },
}

interface WebsiteOpportunityCardProps {
  opportunity: WebsiteOpportunity
  workspaceSlug: string
}

export function WebsiteOpportunityCard({ opportunity, workspaceSlug }: WebsiteOpportunityCardProps) {
  const router = useRouter()
  const level = LEVEL_STYLES[opportunity.level]

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#fff',
      padding: '16px',
      marginBottom: '10px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      {/* Top row: level badge + momentum */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: level.bg,
          color: level.color,
          padding: '2px 8px',
          borderRadius: '4px',
        }}>
          {level.label}
        </span>
        {opportunity.momentum && (
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>
            {opportunity.momentum}
          </span>
        )}
      </div>

      {/* Headline */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 10px', lineHeight: '1.4' }}>
        {opportunity.title}
      </h3>

      {/* Tags + meta */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        {opportunity.tags.slice(0, 3).map(tag => (
          <span key={tag} style={{
            padding: '2px 6px',
            borderRadius: '3px',
            fontSize: '11px',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontWeight: 500,
          }}>
            {tag}
          </span>
        ))}
        <span style={{
          fontSize: '11px',
          backgroundColor: '#ede9fe',
          color: '#5b21b6',
          padding: '2px 6px',
          borderRadius: '3px',
          fontWeight: 600,
        }}>
          {opportunity.matched_service}
        </span>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
          {opportunity.source_type}
        </span>
      </div>

      {/* Why this matters — clamped */}
      <p style={{
        fontSize: '12px',
        color: '#6b7280',
        margin: '0 0 12px',
        lineHeight: '1.5',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {opportunity.why_this_matters}
      </p>

      {/* Bottom row: score + generate */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Score: <strong style={{ color: '#374151' }}>{opportunity.score}</strong>
        </span>
        <button
          onClick={() => router.push(`/${workspaceSlug}/capture/new?opportunity_id=${opportunity.id}`)}
          style={{
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: 'var(--workspace-accent, #1a1560)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          Generate
        </button>
      </div>
    </div>
  )
}
