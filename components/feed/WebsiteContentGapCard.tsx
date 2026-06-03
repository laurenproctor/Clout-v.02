'use client'

import { useRouter } from 'next/navigation'
import type { WebsiteContentGap } from '@/types/feed'

interface WebsiteContentGapCardProps {
  gap: WebsiteContentGap
  workspaceSlug: string
}

export function WebsiteContentGapCard({ gap, workspaceSlug }: WebsiteContentGapCardProps) {
  const router = useRouter()

  const handleGenerate = () => {
    const ctx = [gap.headline, gap.detail, `Opportunity: ${gap.opportunity}`].join('\n\n')
    router.push(`/${workspaceSlug}/capture/new?mode=write&content=${encodeURIComponent(ctx)}`)
  }

  return (
    <div style={{
      backgroundColor: '#fef3c7',
      border: '1px solid #fde68a',
      borderRadius: '6px',
      padding: '16px',
      marginBottom: '10px',
    }}>
      {/* Label */}
      <div style={{
        fontSize: '10px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: '#92400e',
        marginBottom: '8px',
      }}>
        Content Gap
      </div>

      {/* Headline */}
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: '0 0 6px', lineHeight: '1.4' }}>
        {gap.headline}
      </h3>

      {/* Detail */}
      <p style={{ fontSize: '13px', color: '#78350f', margin: '0 0 8px', lineHeight: '1.5' }}>
        {gap.detail}
      </p>

      {/* Opportunity */}
      <p style={{ fontSize: '13px', color: '#92400e', margin: '0 0 12px', lineHeight: '1.5' }}>
        <strong>Opportunity:</strong> {gap.opportunity}
      </p>

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          backgroundColor: '#fde68a',
          color: '#92400e',
          padding: '2px 8px',
          borderRadius: '4px',
        }}>
          {gap.matched_service}
        </span>
        <button
          onClick={handleGenerate}
          style={{
            padding: '5px 14px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: '#1a1560',
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
