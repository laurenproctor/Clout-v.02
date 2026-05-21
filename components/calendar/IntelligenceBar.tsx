'use client'

import type { IntelligenceSignal, IntelligenceLevel } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface IntelligenceBarProps {
  signals: IntelligenceSignal[]
}

const SIGNAL_STYLES: Record<
  IntelligenceLevel,
  { bar: string; dot: string }
> = {
  danger: {
    bar: 'border-red-200 bg-red-50',
    dot: 'bg-red-500',
  },
  warn: {
    bar: 'border-amber-200 bg-amber-50',
    dot: 'bg-amber-500',
  },
  good: {
    bar: 'border-green-200 bg-green-50',
    dot: 'bg-green-500',
  },
}

function Signal({ signal }: { signal: IntelligenceSignal }) {
  const styles = SIGNAL_STYLES[signal.level]
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 flex-shrink-0 rounded-md border px-2.5 py-1.5',
        'text-[11px] whitespace-nowrap',
        styles.bar
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', styles.dot)} />
      <span className="text-zinc-600">
        <strong className="text-zinc-800 font-semibold">{signal.label}</strong>{' '}
        {signal.detail}
      </span>
    </div>
  )
}

export function IntelligenceBar({ signals }: IntelligenceBarProps) {
  if (signals.length === 0) return null

  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-2 flex items-center gap-2.5 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 whitespace-nowrap flex-shrink-0">
        Intelligence
      </span>
      {signals.map((signal, i) => (
        <Signal key={i} signal={signal} />
      ))}
    </div>
  )
}
