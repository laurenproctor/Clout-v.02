'use client'

import { tokens } from '@/lib/feed/tokens'
import { GdeltScoreTooltip } from './GdeltScoreTooltip'
import { SignalCard } from './SignalCard'
import type { SignalCard as SignalCardType } from '@/types/feed'

interface ServiceCardProps {
  card: SignalCardType
  userId: string
  onDismiss?: (cardId: string) => void
}

export function ServiceCard({ card, userId, onDismiss }: ServiceCardProps) {
  return (
    <SignalCard
      card={card}
      userId={userId}
      onDismiss={onDismiss}
      hideFooterBadges
      footerLeft={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <GdeltScoreTooltip score={card.gdelt_score} label={card.gdelt_score_label || 'GDELT score'} />
          <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>
            Matched to:{' '}
            <span style={{
              display: 'inline-block',
              padding: '1px 7px',
              borderRadius: '3px',
              backgroundColor: tokens.colors.serviceTagBg,
              color: tokens.colors.serviceTagText,
              fontWeight: 600,
              fontSize: '11px',
            }}>
              {card.matched_service}
            </span>
          </span>
        </div>
      }
    />
  )
}
