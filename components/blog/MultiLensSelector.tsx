'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lens } from '@/types/domain'

interface MultiLensSelectorProps {
  lenses: Lens[]
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function MultiLensSelector({ lenses, selectedIds, onChange }: MultiLensSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = lenses.filter(l => selectedIds.includes(l.id))
  const filtered = lenses.filter(l =>
    !query.trim() ||
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    (l.description ?? '').toLowerCase().includes(query.toLowerCase())
  )

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id])
  }

  function remove(id: string) {
    onChange(selectedIds.filter(i => i !== id))
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 transition-colors hover:border-zinc-300 focus:outline-none"
      >
        <span className="text-zinc-400 text-xs">
          {selected.length === 0 ? 'Select lenses...' : `${selected.length} selected`}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
      </button>

      {selected.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {selected.map(l => (
            <span
              key={l.id}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 pl-2.5 pr-1.5 py-0.5 text-xs text-zinc-700"
            >
              {l.name}
              <button
                type="button"
                onClick={() => remove(l.id)}
                className="text-zinc-400 hover:text-zinc-700"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center border-b border-zinc-100 px-3 py-2">
            <Search className="h-3.5 w-3.5 text-zinc-400 mr-2" />
            <input
              autoFocus
              type="text"
              placeholder="Search lenses..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="flex-1 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
          </div>
          <div className="max-h-40 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-zinc-400">No lenses found</div>
            ) : (
              filtered.map(l => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggle(l.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-xs transition-colors hover:bg-zinc-50',
                    selectedIds.includes(l.id) ? 'text-zinc-900 font-medium' : 'text-zinc-600'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span>{l.name}</span>
                    {selectedIds.includes(l.id) && (
                      <span className="text-zinc-900">✓</span>
                    )}
                  </div>
                  {l.description && (
                    <div className="text-zinc-400 mt-0.5 truncate">{l.description}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
