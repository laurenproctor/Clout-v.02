'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(value)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="h-9 w-9 rounded-md border border-zinc-200 shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 shrink-0"
          style={{ backgroundColor: isValidHex ? value : '#ffffff' }}
          aria-label={`Pick ${label} color`}
        />
        <input
          ref={inputRef}
          type="color"
          value={isValidHex ? value : '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
          tabIndex={-1}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value
            onChange(v.startsWith('#') ? v : '#' + v)
          }}
          maxLength={7}
          placeholder="#000000"
          className={cn(
            'w-full rounded-md border bg-zinc-50 px-3 py-2 text-sm font-mono focus:border-zinc-400 focus:outline-none',
            isValidHex ? 'border-zinc-200' : 'border-red-300'
          )}
        />
      </div>
    </div>
  )
}
