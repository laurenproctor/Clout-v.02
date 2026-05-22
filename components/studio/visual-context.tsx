'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { deriveVisualContext } from '@/lib/visual/generation/deriveVisualContext'
import type { VisualIntent } from '@/lib/visual/types/visual'

interface VisualContextProps {
  intent: VisualIntent
  brandArchetype?: string
  className?: string
}

export function VisualContext({ intent, brandArchetype, className }: VisualContextProps) {
  const [open, setOpen] = useState(false)
  const summary = deriveVisualContext(intent, brandArchetype)

  return (
    <div className={cn('border-t border-zinc-800/60', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left group"
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 group-hover:text-zinc-500 transition-colors">
          Visual Context
        </span>
        <ChevronDown className={cn('h-3 w-3 text-zinc-700 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <p className="px-4 pb-3 text-[11px] leading-relaxed text-zinc-500">
          {summary}
        </p>
      )}
    </div>
  )
}
