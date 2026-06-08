'use client'

import type { ConversationTheme } from '@/types/domain'

interface Props { theme: ConversationTheme }

export function ConversationThemeCard({ theme }: Props) {
  const scoreColor =
    theme.themeScore >= 70 ? 'bg-green-100 text-green-700 border-green-200' :
    theme.themeScore >= 45 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
    'bg-muted text-muted-foreground border-border'

  const daysSinceFirst = Math.round(
    (Date.now() - new Date(theme.firstDetectedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysSinceSeen = Math.round(
    (Date.now() - new Date(theme.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-medium leading-snug flex-1">{theme.title}</h3>
        <span className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${scoreColor}`}>
          {theme.themeScore}
        </span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{theme.summary}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        {theme.itemCount != null && (
          <span>{theme.itemCount} article{theme.itemCount !== 1 ? 's' : ''}</span>
        )}
        <span>First seen {daysSinceFirst === 0 ? 'today' : `${daysSinceFirst}d ago`}</span>
        {daysSinceSeen < daysSinceFirst && (
          <span>Last seen {daysSinceSeen === 0 ? 'today' : `${daysSinceSeen}d ago`}</span>
        )}
      </div>
    </div>
  )
}
