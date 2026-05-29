'use client'

import { useState, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'
import { tokens } from '@/lib/feed/tokens'
import { DraftPanel } from './DraftPanel'
import type { CompetitorPost } from '@/types/feed'

interface CompetitorPostCardProps {
  post: CompetitorPost
  userId: string
  onDismiss?: (postId: string) => void
}

function PropertyBadge({ label }: { label: string }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 7px',
      borderRadius: '3px',
      fontSize: '10px',
      fontWeight: 600,
      backgroundColor: '#ede9fe',
      color: '#5b21b6',
      letterSpacing: '0.2px',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

export function CompetitorPostCard({ post, userId, onDismiss }: CompetitorPostCardProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  const handleDismiss = useCallback(() => {
    onDismiss?.(post.id)
  }, [post.id, onDismiss])

  const dateStr = post.published_at
    ? new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <div style={{
      border: `1px solid ${tokens.colors.cardBorder}`,
      borderRadius: tokens.borderRadius.card,
      boxShadow: tokens.boxShadow.card,
      backgroundColor: tokens.colors.cardBackground,
      marginBottom: '12px',
      overflow: 'hidden',
    }}>
      <div style={{ padding: tokens.spacing.cardBodyPadding }}>
        {/* Source label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://www.google.com/s2/favicons?domain=${post.brand_domain}&sz=16`}
            width={14}
            height={14}
            alt=""
            style={{ borderRadius: '2px', flexShrink: 0 }}
          />
          <PropertyBadge label={post.property_label} />
          {dateStr && (
            <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>{dateStr}</span>
          )}
        </div>

        {/* Title */}
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '1.4',
            color: '#111827',
            textDecoration: 'none',
            marginBottom: post.excerpt ? '6px' : '10px',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#1a1560')}
          onMouseLeave={e => (e.currentTarget.style.color = '#111827')}
        >
          {post.title}
        </a>

        {/* Excerpt */}
        {post.excerpt && (
          <p style={{
            fontSize: '13px',
            lineHeight: '1.5',
            color: '#6b7280',
            margin: '0 0 10px',
          }}>
            {post.excerpt.length > 200 ? post.excerpt.slice(0, 200) + '…' : post.excerpt}
          </p>
        )}

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${tokens.colors.competitorFooterBorder}`,
          paddingTop: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: 'transparent',
              color: tokens.colors.sectionHeaderColor,
              border: `1px solid ${tokens.colors.cardBorder}`,
              borderRadius: '3px',
              textDecoration: 'none',
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#f9fafb'
              e.currentTarget.style.color = '#111827'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = tokens.colors.sectionHeaderColor
            }}
          >
            Read post
            <ExternalLink size={11} />
          </a>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={handleDismiss}
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: tokens.colors.sectionHeaderColor,
                border: `1px solid #e5e7eb`,
                borderRadius: '3px',
                cursor: 'pointer',
              }}
              aria-label="Dismiss post"
            >
              Dismiss
            </button>
            <button
              onClick={() => setPanelOpen(prev => !prev)}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: panelOpen ? tokens.colors.generateButtonActiveBg : 'var(--workspace-accent, #1a1560)',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
            >
              {panelOpen ? 'Close' : 'Draft a perspective'}
            </button>
          </div>
        </div>
      </div>

      <DraftPanel
        cardId={post.id}
        userId={userId}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        variant="competitor"
      />
    </div>
  )
}
