'use client'

interface NarrativeReviewActionsProps {
  onContinue: (headline: string) => void
  selectedHeadline: string
}

export function NarrativeReviewActions({ onContinue, selectedHeadline }: NarrativeReviewActionsProps) {
  return (
    <div className="rounded-lg border border-amber-100 bg-amber-50 px-5 py-4">
      <p className="text-sm font-medium text-zinc-900 mb-1">Strategy aligned?</p>
      <p className="text-xs text-zinc-500 mb-4">
        Review the narrative strategy and select a headline above, then continue to generate the full article.
        Fixing strategy now is much cheaper than fixing a fully written article.
      </p>
      <button
        type="button"
        onClick={() => onContinue(selectedHeadline)}
        disabled={!selectedHeadline}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Continue — Generate Article
      </button>
    </div>
  )
}
