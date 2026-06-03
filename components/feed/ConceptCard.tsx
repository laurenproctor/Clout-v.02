'use client'

import { tokens } from '@/lib/feed/tokens'
import { SignalCard } from './SignalCard'
import type { SignalCard as SignalCardType } from '@/types/feed'

const CONCEPT_TOOLTIP =
  'GDELT entity score measures coverage velocity of this concept in GDELT\'s entity graph — not the composite news signal formula. Higher scores mean the underlying concept is accelerating across global media. Powered by GDELT Cloud.'

interface ConceptCardProps {
  card: SignalCardType
  userId: string
  onDismiss?: (cardId: string) => void
}

export function ConceptCard({ card, userId, onDismiss }: ConceptCardProps) {
  return (
    <SignalCard
      card={{
        ...card,
        gdelt_score_label: 'GDELT entity score',
      }}
      userId={userId}
      onDismiss={onDismiss}
      footerLeft={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          {/* Custom tooltip for concept entity score */}
          <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor, fontWeight: 500 }}>
            GDELT entity score
          </span>
          <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor, fontWeight: 600 }}>
            {card.gdelt_score !== null ? card.gdelt_score.toFixed(2) : '--'}
          </span>
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: tokens.dimensions.gdeltInfoIconSize, height: tokens.dimensions.gdeltInfoIconSize,
              borderRadius: '50%', border: `1px solid ${tokens.colors.gdeltInfoIconBorder}`,
              fontSize: '9px', fontStyle: 'italic', fontFamily: 'serif',
              cursor: 'default', color: tokens.colors.gdeltInfoIconBorder,
            }}
            title={CONCEPT_TOOLTIP}
          >
            i
          </span>
        </span>
      }
    >
      {/* Concept-surfaced line */}
      {card.concept_surfaced_via && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          marginBottom: '8px', color: tokens.colors.conceptSurfacedColor, fontSize: '12px',
        }}>
          <span>◆</span>
          <span>Surfaced via GDELT: {card.concept_surfaced_via}</span>
          <span style={{
            padding: '1px 5px', borderRadius: '3px',
            backgroundColor: tokens.colors.gdeltBadgeBg, color: tokens.colors.gdeltBadgeText,
            fontSize: tokens.fontSize.gdeltBadge, fontWeight: 600,
          }}>
            GDELT
          </span>
        </div>
      )}

      {/* Why Now block */}
      {card.why_now && (
        <div style={{
          backgroundColor: tokens.colors.whyNowBackground,
          borderLeft: tokens.borders.whyNowLeft,
          padding: '8px 12px',
          marginBottom: '8px',
          borderRadius: '0 3px 3px 0',
          fontSize: '12px',
          lineHeight: '1.5',
          color: '#374151',
        }}>
          <strong style={{ color: tokens.colors.conceptSurfacedColor }}>Why now: </strong>
          {card.why_now}
        </div>
      )}
    </SignalCard>
  )
}
