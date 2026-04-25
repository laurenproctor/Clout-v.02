'use client'

import { useState, useRef, useEffect } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'

interface LensPickerProps {
  lenses: Lens[]
  selectedLensId: string
  onChange: (id: string) => void
  className?: string
}

export function LensPicker({ lenses, selectedLensId, onChange, className }: LensPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = lenses.find((l) => l.id === selectedLensId)

  const systemLenses = lenses.filter((l) => l.scope === 'system')
  const workspaceLenses = lenses.filter((l) => l.scope !== 'system')

  function filterLenses(list: Lens[]) {
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q)
    )
  }

  const filteredSystem = filterLenses(systemLenses)
  const filteredWorkspace = filterLenses(workspaceLenses)
  const hasResults = filteredSystem.length > 0 || filteredWorkspace.length > 0

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function select(id: string) {
    onChange(id)
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300',
            open && 'border-zinc-300 bg-zinc-50',
            className
          )}
        >
          <span className="max-w-[140px] truncate">
            {selected ? selected.name : 'Choose lens'}
          </span>
          {selected?.scope === 'system' && (
            <span className="text-zinc-400">✦</span>
          )}
          <ChevronDown className={cn('h-3 w-3 text-zinc-400 transition-transform', open && 'rotate-180')} />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align="start"
          className="z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg outline-none animate-in fade-in-0 zoom-in-95"
        >
          {/* Search */}
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3 py-2.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search lenses…"
              className="flex-1 bg-transparent text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>

          {/* Results */}
          <div className="max-h-64 overflow-y-auto py-1.5">
            {!hasResults && (
              <p className="px-3 py-4 text-center text-xs text-zinc-400">No lenses match.</p>
            )}

            {filteredSystem.length > 0 && (
              <div>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Standard
                </p>
                {filteredSystem.map((lens) => (
                  <LensOption
                    key={lens.id}
                    lens={lens}
                    selected={lens.id === selectedLensId}
                    onSelect={() => select(lens.id)}
                  />
                ))}
              </div>
            )}

            {filteredWorkspace.length > 0 && (
              <div>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                  Your lenses
                </p>
                {filteredWorkspace.map((lens) => (
                  <LensOption
                    key={lens.id}
                    lens={lens}
                    selected={lens.id === selectedLensId}
                    onSelect={() => select(lens.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function LensOption({
  lens,
  selected,
  onSelect,
}: {
  lens: Lens
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-50',
        selected && 'bg-zinc-50'
      )}
    >
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        {selected ? (
          <Check className="h-3.5 w-3.5 text-zinc-900" />
        ) : (
          <span className="h-3.5 w-3.5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn('text-xs font-medium text-zinc-900', selected && 'font-semibold')}>
          {lens.name}
          {lens.scope === 'system' && <span className="ml-1 text-zinc-400">✦</span>}
        </p>
        {lens.description && (
          <p className="mt-0.5 text-[11px] leading-[1.4] text-zinc-400">{lens.description}</p>
        )}
      </div>
    </button>
  )
}
