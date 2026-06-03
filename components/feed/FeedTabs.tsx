'use client'

import { tokens } from '@/lib/feed/tokens'
import type { FeedTab } from '@/types/feed'

const TABS: { id: FeedTab; label: string }[] = [
  { id: 'news',        label: 'News' },
  { id: 'website',    label: 'Website Intelligence' },
  { id: 'concepts',   label: 'Concepts & Explainers' },
  { id: 'competitors', label: 'Competitors' },
]

interface FeedTabsProps {
  activeTab: FeedTab
  onTabChange: (tab: FeedTab) => void
}

export function FeedTabs({ activeTab, onTabChange }: FeedTabsProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '0',
      borderBottom: `1px solid ${tokens.colors.cardBorder}`,
      marginBottom: '20px',
    }}>
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === id ? 600 : 500,
            color: activeTab === id ? '#111827' : tokens.colors.sectionHeaderColor,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === id ? '2px solid #1a1560' : '2px solid transparent',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'color 0.1s',
            marginBottom: '-1px',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
