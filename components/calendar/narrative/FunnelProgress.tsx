import type { ArcFunnelStep } from '@/types/calendar'
import { cn } from '@/lib/utils'

interface FunnelProgressProps {
  steps: ArcFunnelStep[]
}

export function FunnelProgress({ steps }: FunnelProgressProps) {
  return (
    <div className="bg-zinc-50 border-l border-r border-zinc-200 px-4 py-2.5 flex items-center overflow-x-auto [scrollbar-width:none]">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center flex-1 min-w-[70px]">
          <div className="flex-1 text-center">
            <p
              className={cn(
                'text-[9px] font-bold uppercase tracking-wide mb-1',
                step.state === 'done'
                  ? 'text-zinc-400'
                  : step.state === 'active'
                  ? 'text-indigo-600'
                  : 'text-zinc-200'
              )}
            >
              {step.label}
            </p>
            <div
              className={cn(
                'w-2 h-2 rounded-full mx-auto border',
                step.state === 'done'
                  ? 'bg-zinc-400 border-zinc-500'
                  : step.state === 'active'
                  ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_6px_rgba(99,102,241,0.5)]'
                  : 'bg-zinc-200 border-zinc-300'
              )}
            />
          </div>
          {i < steps.length - 1 && (
            <span className="text-zinc-200 text-xs mx-1 flex-shrink-0">→</span>
          )}
        </div>
      ))}
    </div>
  )
}
