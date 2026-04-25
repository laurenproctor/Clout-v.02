'use client'

import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'
import { LensPicker } from '@/components/shared/lens-picker'

interface GeneratingAsBarProps {
  profileName: string | null
  lenses: Lens[]
  selectedLensId: string
  onLensChange: (id: string) => void
  readOnly?: boolean
  className?: string
}

export function GeneratingAsBar({
  profileName,
  lenses,
  selectedLensId,
  onLensChange,
  readOnly = false,
  className,
}: GeneratingAsBarProps) {
  const name = profileName?.trim() || 'Your Profile'
  const selectedLens = lenses.find((l) => l.id === selectedLensId)

  if (readOnly) {
    return (
      <p className={cn('text-xs text-zinc-400', className)}>
        Written as{' '}
        <span className="font-medium text-zinc-600">{name}</span>
        {selectedLens && (
          <>
            {' '}·{' '}
            <span className="font-medium text-zinc-600">{selectedLens.name}</span>
          </>
        )}
      </p>
    )
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Profile chip */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
          Perspective
        </span>
        <span className="text-xs font-medium text-zinc-700">{name}</span>
      </div>

      {/* Lens picker */}
      <LensPicker
        lenses={lenses}
        selectedLensId={selectedLensId}
        onChange={onLensChange}
      />
    </div>
  )
}
