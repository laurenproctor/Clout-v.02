'use client'

import { useState } from 'react'
import { tokens } from '@/lib/feed/tokens'

interface ExampleSignalCardProps {
  topic: string
  index: number
}

const MOCK_DATA = [
  {
    tone: 'positive' as const,
    toneStyle: { bg: '#dcfce7', color: '#166534' },
    velocity: 72,
    tags: ['authority building', 'frameworks', 'positioning'],
    rationale: 'Tier 1 opportunity · High velocity · Unclaimed in your niche',
    cta: 'Generate',
  },
  {
    tone: 'neutral' as const,
    toneStyle: { bg: '#f3f4f6', color: '#374151' },
    velocity: 41,
    tags: ['competitor gap', 'whitespace', 'category design'],
    rationale: 'Emerging framework · Vocabulary forming',
    cta: 'Explore framework',
  },
  {
    tone: 'negative' as const,
    toneStyle: { bg: '#fee2e2', color: '#991b1b' },
    velocity: 85,
    tags: ['timing signal', 'emerging narrative', 'velocity'],
    rationale: 'Competitive whitespace · Time-sensitive',
    cta: 'Claim your angle',
  },
]

export function ExampleSignalCard({ topic, index }: ExampleSignalCardProps) {
  const [toastVisible, setToastVisible] = useState(false)
  const mock = MOCK_DATA[index % MOCK_DATA.length]

  function handleCtaClick() {
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  return (
    <>
      {toastVisible && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1a1560',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 9999,
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}>
          Connect your signal source to generate real perspectives
        </div>
      )}

      <div style={{
        position: 'relative',
        border: `1px solid ${tokens.colors.cardBorder}`,
        borderRadius: tokens.borderRadius.card,
        boxShadow: tokens.boxShadow.card,
        backgroundColor: tokens.colors.cardBackground,
        marginBottom: '12px',
        overflow: 'hidden',
        animation: 'feedCardEnter 0.35s ease both',
        animationDelay: `${index * 80}ms`,
      }}>
        {/* Example banner */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          backgroundColor: '#fef3c7',
          color: '#92400e',
          fontSize: '10px',
          fontWeight: 700,
          padding: '3px 8px',
          borderBottomLeftRadius: '4px',
          letterSpacing: '0.3px',
        }}>
          EXAMPLE
        </div>

        <div style={{ padding: tokens.spacing.cardBodyPadding }}>
          {/* Title */}
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            lineHeight: '1.4',
            margin: '0 0 10px',
            color: '#111827',
            paddingRight: '64px',
          }}>
            {topic}
          </h3>

          {/* Signal row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: mock.toneStyle.bg,
              color: mock.toneStyle.color,
              textTransform: 'capitalize',
            }}>
              {mock.tone}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>Coverage velocity</span>
              <div style={{
                width: '80px',
                height: '4px',
                backgroundColor: tokens.colors.momentumBarTrack,
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${mock.velocity}%`,
                  height: '100%',
                  backgroundColor: tokens.colors.momentumBarFill,
                }} />
              </div>
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>+{mock.velocity}%</span>
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
            {mock.tags.map(tag => (
              <span key={tag} style={{
                padding: '2px 7px',
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

          {/* Rationale */}
          <div style={{
            fontSize: '11px',
            color: tokens.colors.sectionHeaderColor,
            marginBottom: '10px',
            letterSpacing: '0.2px',
          }}>
            {mock.rationale}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            <button
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: 'transparent',
                color: tokens.colors.sectionHeaderColor,
                border: '1px solid #e5e7eb',
                borderRadius: '3px',
                cursor: 'default',
                opacity: 0.6,
              }}
            >
              Dismiss
            </button>
            <button
              onClick={handleCtaClick}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: 'var(--workspace-accent, #1a1560)',
                color: '#fff',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'background-color 0.1s',
              }}
            >
              {mock.cta}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
