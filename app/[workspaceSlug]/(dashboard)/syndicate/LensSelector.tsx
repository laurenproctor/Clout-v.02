'use client'

import { LENS_CATEGORIES, SyndicationLens } from '@/lib/syndication/types/lenses'

interface LensSelectorProps {
  availableLenses: SyndicationLens[]
  selectedLenses: string[]   // lens IDs
  onToggle: (lensId: string) => void
  isRunning: boolean
}

export function LensSelector({ availableLenses, selectedLenses, onToggle, isRunning }: LensSelectorProps) {
  const maxReached = selectedLenses.length >= 2
  const workspaceLenses = availableLenses.filter((l) => !l.isPreset)

  return (
    <div className="space-y-4">
      {LENS_CATEGORIES.map((category) => {
        const lensesInCategory = category.lensNames
          .map((lensName) => availableLenses.find((l) => l.name === lensName))
          .filter((l): l is SyndicationLens => l !== undefined)

        if (lensesInCategory.length === 0) return null

        return (
          <div key={category.name}>
            <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5">{category.name}</p>
            <div className="flex flex-wrap gap-2">
              {lensesInCategory.map((lens) => {
                const isActive = selectedLenses.includes(lens.id)
                const isDisabled = isRunning || (!isActive && maxReached)
                return (
                  <button
                    key={lens.id}
                    onClick={() => !isDisabled && onToggle(lens.id)}
                    disabled={isDisabled}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                      isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                      isDisabled ? 'opacity-40 cursor-not-allowed' : '',
                    ].join(' ')}
                  >
                    {lens.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {workspaceLenses.length > 0 && (
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-widest mb-1.5">Custom</p>
          <div className="flex flex-wrap gap-2">
            {workspaceLenses.map((lens) => {
              const isActive = selectedLenses.includes(lens.id)
              const isDisabled = isRunning || (!isActive && maxReached)
              return (
                <button
                  key={lens.id}
                  onClick={() => !isDisabled && onToggle(lens.id)}
                  disabled={isDisabled}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                    isDisabled ? 'opacity-40 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  {lens.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
