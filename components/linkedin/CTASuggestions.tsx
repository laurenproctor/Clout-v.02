'use client'

interface CTASuggestionsProps {
  suggestions: string[]
  onSelect: (text: string) => void
}

export function CTASuggestions({ suggestions, onSelect }: CTASuggestionsProps) {
  if (!suggestions.length) return null

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">CTA Suggestions</p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, i) => (
          <button
            key={i}
            onClick={() => onSelect(suggestion)}
            className="text-xs border border-zinc-200 rounded-full px-3 py-1.5 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-400 mt-1">Click to append to post</p>
    </div>
  )
}
