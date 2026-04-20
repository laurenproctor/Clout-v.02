import Link from 'next/link'

interface UpgradePromptProps {
  type: 'capture' | 'generation'
  used: number
  limit: number
  onDismiss?: () => void
}

export function UpgradePrompt({ type, used, limit, onDismiss }: UpgradePromptProps) {
  const label = type === 'capture' ? 'captures' : 'generations'

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-900">
            Monthly {label} limit reached
          </p>
          <p className="text-xs text-amber-700">
            You've used {used} of {limit} {label} this month. Upgrade to continue.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Link
          href="/billing"
          className="rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 transition-colors"
        >
          Upgrade plan →
        </Link>
        <Link
          href="/billing"
          className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
        >
          View usage
        </Link>
      </div>
    </div>
  )
}
