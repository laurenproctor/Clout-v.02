'use client'

import { tokens } from '@/lib/feed/tokens'

const STATS = [
  { label: 'System-wide signals monitored today', value: '847' },
  { label: 'Narrative domains tracked', value: '12' },
  { label: 'Emerging frameworks detected across monitored sectors', value: '3' },
]

export function EditorialBriefingCard() {
  return (
    <div style={{
      backgroundColor: '#f5f3ff',
      borderLeft: '3px solid #4f46e5',
      borderRadius: tokens.borderRadius.card,
      border: `1px solid #e0e7ff`,
      borderLeftWidth: '3px',
      padding: '16px 18px',
      marginBottom: '16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.8px',
          color: '#4f46e5',
        }}>
          Signal Intelligence Briefing
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>Updated continuously</span>
      </div>

      <p style={{
        fontSize: '15px',
        fontWeight: 700,
        color: '#111827',
        margin: '0 0 4px',
      }}>
        Your signal layer is active
      </p>

      <p style={{
        fontSize: '13px',
        color: '#374151',
        lineHeight: '1.6',
        margin: '0 0 16px',
      }}>
        Clout monitors thousands of signals daily to surface emerging narratives before they peak. Your feed personalizes as interactions accumulate.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {STATS.map(({ label, value }) => (
          <div key={label}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1560', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '3px' }}>{label}</div>
          </div>
        ))}
      </div>

      <p style={{
        fontSize: '11px',
        color: '#9ca3af',
        fontStyle: 'italic',
        margin: 0,
      }}>
        Stats reflect system-wide activity. Your personalized feed activates as signals accumulate.
      </p>
    </div>
  )
}
