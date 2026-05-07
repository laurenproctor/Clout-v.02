'use client'

import { useState } from 'react'

interface MentionTagsProps {
  mentions: string[]
  onChange: (mentions: string[]) => void
}

export function MentionTags({ mentions, onChange }: MentionTagsProps) {
  const [input, setInput] = useState('')

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const name = input.trim().replace(/^@/, '')
      if (name && !mentions.includes(name)) {
        onChange([...mentions, name])
      }
      setInput('')
    }
  }

  return (
    <div>
      <p className="text-xs font-medium text-zinc-500 mb-2">Mentions</p>
      <div className="flex flex-wrap gap-1.5 items-center">
        {mentions.map(name => (
          <span key={name} className="inline-flex items-center gap-1 bg-zinc-100 rounded-full px-2.5 py-1 text-xs text-zinc-600">
            @{name}
            <button
              onClick={() => onChange(mentions.filter(m => m !== name))}
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
          placeholder="Add @mention..."
          className="text-xs border-0 outline-none bg-transparent text-zinc-600 placeholder:text-zinc-300 w-24"
        />
      </div>
    </div>
  )
}
