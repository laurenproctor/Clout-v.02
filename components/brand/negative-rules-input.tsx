'use client'

import { useState, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NegativeRulesInputProps {
  value: string[]
  onChange: (value: string[]) => void
  className?: string
}

export function NegativeRulesInput({ value, onChange, className }: NegativeRulesInputProps) {
  const [input, setInput] = useState('')

  function add() {
    const trimmed = input.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
  }

  function remove(tag: string) {
    onChange(value.filter(v => v !== tag))
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        Avoid These Styles
      </label>
      <div
        className="flex min-h-[42px] flex-wrap gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 focus-within:border-zinc-400 cursor-text"
        onClick={e => (e.currentTarget.querySelector('input') as HTMLInputElement)?.focus()}
      >
        {value.map(tag => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-xs text-zinc-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-zinc-400 hover:text-zinc-700 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={add}
          placeholder={value.length === 0 ? 'e.g. Stock photos, Neon colors...' : ''}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-400"
        />
      </div>
      <p className="text-xs text-zinc-400">Press Enter or comma to add. These guide the AI away from unwanted styles.</p>
    </div>
  )
}
