'use client'

import { useState, type ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

// Platform-agnostic "Alternate angles" list. Alternates are explicitly
// subordinate to the recommended anchor: collapsed by default so the result
// never reads as a competing stack. Expanding one renders the platform's own
// full card via the `renderCard` prop — the list stays generic across platforms.
interface AlternateAnglesListProps<T extends { id: string }> {
  alternates: T[]
  getTitle: (item: T) => string
  renderCard: (item: T, index: number) => ReactNode
}

function AlternateAngleItem<T extends { id: string }>({
  item,
  index,
  getTitle,
  renderCard,
}: {
  item: T
  index: number
  getTitle: (item: T) => string
  renderCard: (item: T, index: number) => ReactNode
}) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-1 px-1 py-1 text-left text-xs font-medium text-zinc-500 hover:text-zinc-700"
        >
          <ChevronRight className="h-3 w-3 rotate-90 transition-transform" />
          {getTitle(item)}
        </button>
        {renderCard(item, index)}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-zinc-300"
    >
      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      <span className="truncate text-sm text-zinc-600">{getTitle(item)}</span>
    </button>
  )
}

export function AlternateAnglesList<T extends { id: string }>({
  alternates,
  getTitle,
  renderCard,
}: AlternateAnglesListProps<T>) {
  if (alternates.length === 0) return null
  return (
    <div className="space-y-2 border-t border-zinc-100 pt-4">
      <p className="text-xs font-medium text-zinc-400">Alternate angles</p>
      {alternates.map((item, i) => (
        <AlternateAngleItem
          key={item.id}
          item={item}
          index={i}
          getTitle={getTitle}
          renderCard={renderCard}
        />
      ))}
    </div>
  )
}
