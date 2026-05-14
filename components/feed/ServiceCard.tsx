'use client'

import { tokens } from '@/lib/feed/tokens'
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
          <span style={{ fontSize: '10px', color: tokens.colors.sectionHeaderColor, letterSpacing: '0.2px' }}>
            Signal source: GDELT Cloud · Matched to your service profile
          </span>
        </div>
      }
    />
  )
}
