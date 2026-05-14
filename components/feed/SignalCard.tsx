'use client'

import { useState, useCallback } from 'react'
import { tokens } from '@/lib/feed/tokens'
import { GdeltScoreTooltip } from './GdeltScoreTooltip'
import { BadgeGap } from './BadgeGap'
import { BadgeTiming } from './BadgeTiming'
import { DraftPanel } from './DraftPanel'
import type { SignalCard as SignalCardType } from '@/types/feed'

interface SignalCardProps {
  card: SignalCardType
  userId: string
  onDraftGenerated?: (draft: string) => void
  onDismiss?: (cardId: string) => void
  children?: React.ReactNode // for ConceptCard/ServiceCard extensions
  hideFooterBadges?: boolean
  footerLeft?: React.ReactNode
}

export function SignalCard({
  card,
  userId,
  onDismiss,
  children,
  hideFooterBadges = false,
  footerLeft,
}: SignalCardProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  const handleGenerate = useCallback(() => {
    if (panelOpen) {
      setPanelOpen(false)
    } else {
      setPanelOpen(true)
    }
  }, [panelOpen])

  const handleDismiss = useCallback(() => {
    onDismiss?.(card.id)
  }, [card.id, onDismiss])

  const toneStyle = {
    positive: { bg: tokens.colors.tonePositiveBg, color: tokens.colors.tonePositiveText },
    negative: { bg: tokens.colors.toneNegativeBg, color: tokens.colors.toneNegativeText },
    neutral:  { bg: tokens.colors.toneNeutralBg,  color: tokens.colors.toneNeutralText },
  }[card.tone]

  const hasGap = card.timing_classification !== null
  // Default to gap when no content topics are known
  const gapStatus: 'gap' | 'covered' = 'gap'

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
        {/* Card top: title + trending badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
          <h3 style={{ flex: 1, fontSize: '14px', fontWeight: 600, lineHeight: '1.4', margin: 0, color: '#111827' }}>
            {card.title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {card.is_trending && (
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: tokens.colors.trendingBadgeBg,
                color: tokens.colors.trendingBadgeText,
              }}>
                Trending
              </span>
            )}
            {card.opportunity_tier === 1 && (
              <span style={{
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                backgroundColor: tokens.colors.tier1Badge,
                color: '#fff',
              }}>
                Tier 1
              </span>
            )}
          </div>
        </div>

        {/* Extension slot for ConceptCard content (surfaced-via + why-now) */}
        {children}

        {/* Signal row: tone pill + momentum */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: toneStyle.bg,
            color: toneStyle.color,
            textTransform: 'capitalize',
          }}>
            {card.tone}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>Coverage velocity</span>
            <div style={{
              width: tokens.dimensions.momentumBarWidth,
              height: tokens.dimensions.momentumBarHeight,
              backgroundColor: tokens.colors.momentumBarTrack,
              borderRadius: '2px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${card.momentum_bar_width ?? 0}%`,
                height: '100%',
                backgroundColor: tokens.colors.momentumBarFill,
              }} />
            </div>
            {card.momentum_pct && (
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: 500 }}>{card.momentum_pct}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        {card.tags && card.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
            {card.tags.map(tag => (
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
        )}

        {/* Ranking rationale */}
        {card.ranking_rationale && card.ranking_rationale.length > 0 && (
          <div style={{
            fontSize: tokens.fontSize.rationale,
            color: tokens.colors.sectionHeaderColor,
            marginBottom: '10px',
            letterSpacing: '0.2px',
          }}>
            {card.ranking_rationale.join(' · ')}
          </div>
        )}

        {/* Card footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {footerLeft ?? (
              <>
                <GdeltScoreTooltip
                  score={card.gdelt_score}
                  label={card.gdelt_score_label || 'Signal strength'}
                />
                {!hideFooterBadges && <BadgeGap status={gapStatus} />}
                {!hideFooterBadges && card.timing_classification && hasGap && (
                  <BadgeTiming classification={card.timing_classification} />
                )}
              </>
            )}
          </div>
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
              aria-label="Dismiss signal"
            >
              Dismiss
            </button>
            <button
              onClick={handleGenerate}
              style={{
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: panelOpen ? tokens.colors.generateButtonActiveBg : tokens.colors.generateButtonBg,
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

      {/* Draft panel */}
      <DraftPanel
        cardId={card.id}
        userId={userId}
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
      />
    </div>
  )
}
