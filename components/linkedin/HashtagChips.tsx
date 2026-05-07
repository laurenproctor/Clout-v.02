'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface HashtagChipsProps {
  hashtags: string[]
  onChange: (hashtags: string[]) => void
}

export function HashtagChips({ hashtags, onChange }: HashtagChipsProps) {
  const [input, setInput] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const tag = input.trim().replace(/^#/, '')
      if (tag && !hashtags.includes(tag)) {
        onChange([...hashtags, tag])
      }
      setInput('')
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">Hashtags</p>
      <div className="flex flex-wrap gap-1.5 items-center">
        {hashtags.map(tag => (
          <span key={tag} className="inline-flex items-center gap-1 bg-zinc-100 rounded-full px-2.5 py-1 text-xs text-zinc-600">
            #{tag}
            <button
              onClick={() => onChange(hashtags.filter(h => h !== tag))}
              className="text-zinc-400 hover:text-zinc-700 ml-0.5"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="text-xs border-0 outline-none bg-transparent text-zinc-600 placeholder:text-zinc-300 w-24"
        />
        <button onClick={() => {}} className="text-zinc-400 hover:text-zinc-600" title="Regenerate hashtags">
          <RefreshCw size={12} />
        </button>
      </div>
    </div>
  )
}
