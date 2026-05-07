'use client'

export const LOADING_STEPS = [
  'Source thesis extracted',
  'Leverage points detected',
  'Audience psychology mapped',
  'Lenses applied',
  'Platform-native outputs generating',
  'Finalizing',
]

export function LoadingPhaseIndicator({ stepIndex }: { stepIndex: number }) {
  return (
    <div className="space-y-1">
      {LOADING_STEPS.slice(0, stepIndex + 1).map((step, i) => {
        const isDone = i < stepIndex
        const isCurrent = i === stepIndex
        return (
          <div key={step} className="flex items-center gap-2">
            {isDone && <span className="text-xs text-zinc-400">✓</span>}
            {isCurrent && <div className="h-1.5 w-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0" />}
            <span className={`text-xs ${isDone ? 'text-zinc-300' : 'text-zinc-500'}`}>{step}</span>
          </div>
        )
      })}
    </div>
  )
}
