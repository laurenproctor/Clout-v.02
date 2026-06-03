'use client'

import { useRouter } from 'next/navigation'
import type { WebsiteOpportunity } from '@/types/feed'

interface WebsiteFeaturedCardProps {
  opportunity: WebsiteOpportunity
  workspaceSlug: string
}

export function WebsiteFeaturedCard({ opportunity, workspaceSlug }: WebsiteFeaturedCardProps) {
  const router = useRouter()

  return (
    <div style={{
      padding: '24px',
      borderRadius: '12px',
      backgroundColor: '#fff',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      marginBottom: '16px',
    }}>
      {/* Top row: badge + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          backgroundColor: '#ede9fe',
          color: '#4f46e5',
          padding: '3px 8px',
          borderRadius: '4px',
        }}>
          Top Opportunity
        </span>
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          backgroundColor: '#f3f4f6',
          color: '#374151',
          padding: '3px 10px',
          borderRadius: '20px',
        }}>
          Score: {opportunity.score} / 100
        </span>
      </div>

      {/* Headline */}
      <h2 style={{ fontSize: '20px', fontWeight: 650, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }}>
        {opportunity.title}
      </h2>

      {/* Tags */}
      {opportunity.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '16px' }}>
          {opportunity.tags.map(tag => (
            <span key={tag} style={{
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              backgroundColor: '#f3f4f6',
              color: '#6b7280',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Why this matters */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: '#9ca3af',
          marginBottom: '6px',
        }}>
          Why this matters
        </div>
        <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
          {opportunity.why_this_matters}
        </p>
      </div>

      {/* Meta row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Matched to:</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#ede9fe',
            color: '#5b21b6',
            padding: '2px 8px',
            borderRadius: '4px',
          }}>
            {opportunity.matched_service}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Source:</span>
          {opportunity.source_url ? (
            <a
              href={opportunity.source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', color: '#374151', fontWeight: 500, textDecoration: 'underline' }}
            >
              {opportunity.source_type}
            </a>
          ) : (
            <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{opportunity.source_type}</span>
          )}
        </div>
      </div>

      {/* Suggested formats */}
      {opportunity.formats.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', marginRight: '8px' }}>Suggested formats:</span>
          {opportunity.formats.map(f => (
            <span key={f} style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              backgroundColor: '#f0fdf4',
              color: '#166534',
              fontWeight: 500,
              marginRight: '4px',
              marginBottom: '4px',
            }}>
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Generate button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => router.push(`/${workspaceSlug}/capture/new?opportunity_id=${opportunity.id}`)}
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
          Generate Content
        </button>
      </div>
    </div>
  )
}
