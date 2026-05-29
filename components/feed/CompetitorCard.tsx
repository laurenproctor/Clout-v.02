'use client'

import { useState, useCallback } from 'react'
import { tokens } from '@/lib/feed/tokens'
import { DraftPanel } from './DraftPanel'
import type { CompetitorCard as CompetitorCardType } from '@/types/feed'

interface CompetitorCardProps {
  competitor: CompetitorCardType
  userId: string
}

export function CompetitorCard({ competitor, userId }: CompetitorCardProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  const handleDraft = useCallback(() => {
    setPanelOpen(prev => !prev)
  }, [])

  return (
    <div
      style={{
        border: `1px solid ${tokens.colors.cardBorder}`,
        borderRadius: tokens.borderRadius.card,
        boxShadow: tokens.boxShadow.card,
        backgroundColor: tokens.colors.cardBackground,
        marginBottom: '12px',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: tokens.spacing.cardBodyPadding }}>
        {/* Competitor name + handle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <span style={{
            fontSize: '14px', fontWeight: 700, color: tokens.colors.competitorNameColor,
          }}>
            {competitor.competitor_name}
          </span>
          {competitor.competitor_handle && (
            <span style={{ fontSize: '12px', color: tokens.colors.competitorHandleColor }}>
              @{competitor.competitor_handle}
            </span>
          )}
        </div>

        {/* Headline */}
        <p style={{
          fontSize: tokens.fontSize.competitorHeadline,
          fontWeight: 600,
          lineHeight: '1.4',
          color: '#111827',
          margin: '0 0 8px',
        }}>
          {competitor.headline}
        </p>

        {/* Meta: date + coverage badge + momentum */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>
            {competitor.date ? new Date(competitor.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
          </span>
          <span style={{
            padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 600,
            backgroundColor: competitor.has_coverage ? '#6b7280' : '#f59e0b',
            color: '#fff',
          }}>
            {competitor.has_coverage ? 'Has coverage' : 'No coverage'}
          </span>
          {competitor.momentum_text && (
            <span style={{
              fontSize: '11px', fontWeight: 500,
              color: competitor.momentum_flat ? tokens.colors.sectionHeaderColor : '#374151',
            }}>
              {competitor.momentum_text}
              {competitor.momentum_flat && <span style={{ marginLeft: '3px', color: tokens.colors.sectionHeaderColor }}>· Flat</span>}
            </span>
          )}
        </div>

        {/* Signal attribution */}
        <div style={{
          fontSize: '10px', color: tokens.colors.sectionHeaderColor,
          display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px',
        }}>
          <span style={{
            width: tokens.dimensions.signalAttrDotSize, height: tokens.dimensions.signalAttrDotSize,
            borderRadius: '50%', backgroundColor: tokens.colors.signalAttrDot, flexShrink: 0,
          }} />
          Signal source: GDELT Cloud · Competitor topic tracking active
        </div>

        {/* Footer */}
        <div style={{
          borderTop: `1px solid ${tokens.colors.competitorFooterBorder}`,
          paddingTop: '10px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={handleDraft}
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
            {panelOpen ? 'Close' : 'Claim your angle'}
          </button>
        </div>
      </div>

      {/* Competitor draft panel */}
      <DraftPanel
        cardId={competitor.id}
        userId={userId}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        variant="competitor"
        differentiatedAngle={competitor.differentiated_angle}
      />
    </div>
  )
}
