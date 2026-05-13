'use client'

import { cn } from '@/lib/utils'

interface StepProgressHeaderProps {
  currentStep: 1 | 2 | 3 | 4
  clickableSteps?: number[]
  onStepClick?: (step: number) => void
}

const STEPS = [
  { number: 1, label: 'Strategic Setup' },
  { number: 2, label: 'Narrative Direction' },
  { number: 3, label: 'Review Article' },
  { number: 4, label: 'Social Posts' },
]

export function StepProgressHeader({ currentStep, clickableSteps = [], onStepClick }: StepProgressHeaderProps) {
  return (
    <div className="flex items-center gap-0 px-8 py-4 border-b border-zinc-100 bg-white">
      {STEPS.map((step, i) => {
        const isCompleted = step.number < currentStep
        const isCurrent = step.number === currentStep
        const isClickable = clickableSteps.includes(step.number)

        return (
          <div key={step.number} className="flex items-center">
            <div
              className={cn('flex items-center gap-2.5', isClickable && 'cursor-pointer group')}
              onClick={() => isClickable && onStepClick?.(step.number)}
              role={isClickable ? 'button' : undefined}
            >
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  isCompleted && 'bg-zinc-900 text-white',
                  isCurrent && 'bg-zinc-900 text-white',
                  !isCompleted && !isCurrent && 'bg-zinc-100 text-zinc-400',
                  isClickable && 'group-hover:opacity-70'
                )}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isCurrent && 'text-zinc-900',
                  isCompleted && 'text-zinc-500',
                  !isCompleted && !isCurrent && 'text-zinc-400',
                  isClickable && 'group-hover:text-zinc-700'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'mx-4 h-px w-12',
                step.number < currentStep ? 'bg-zinc-900' : 'bg-zinc-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
