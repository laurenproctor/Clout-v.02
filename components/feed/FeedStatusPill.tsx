'use client'

type FeedStatusType = 'live' | 'updating' | 'learning' | 'high_signal'

interface FeedStatusPillProps {
  status: FeedStatusType
}

const CONFIG: Record<FeedStatusType, { label: string; dotColor: string; bg: string; text: string; border: string; pulse: boolean }> = {
  live:        { label: 'Live',                  dotColor: '#22c55e', bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', pulse: true },
  updating:    { label: 'Updating',              dotColor: '#f59e0b', bg: '#fffbeb', text: '#92400e', border: '#fde68a', pulse: false },
  learning:    { label: 'Learning your territory', dotColor: '#4f46e5', bg: '#ede9fe', text: '#3730a3', border: '#c4b5fd', pulse: false },
  high_signal: { label: 'High signal activity',  dotColor: '#ef4444', bg: '#fef2f2', text: '#991b1b', border: '#fecaca', pulse: false },
}

export function FeedStatusPill({ status }: FeedStatusPillProps) {
  const { label, dotColor, bg, text, border, pulse } = CONFIG[status]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes livePulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      ` }} />
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        fontSize: '11px',
        fontWeight: 600,
        color: text,
        flexShrink: 0,
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: dotColor,
          flexShrink: 0,
          animation: pulse ? 'livePulse 2s ease infinite' : 'none',
        }} />
        {label}
      </span>
    </>
  )
}
