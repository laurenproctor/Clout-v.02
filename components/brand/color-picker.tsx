'use client'

import { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

function expandShorthand(hex: string): string {
  return hex.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, (_, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
}

function isFullHex(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v)
}

function rgbToHex(value: string): string | null {
  const match = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (!match) return null
  const [r, g, b] = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
  if (r > 255 || g > 255 || b > 255) return null
  return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isFocused = useRef(false)
  const [localText, setLocalText] = useState(value)

  // Sync from external value when not actively typing (e.g. API load, inference)
  useEffect(() => {
    if (!isFocused.current) {
      setLocalText(value)
    }
  }, [value])

  const expanded = expandShorthand(localText)
  const isValid = isFullHex(expanded)
  const isShort = /^#[0-9A-Fa-f]{3}$/.test(localText)
  const isEmpty = localText === '' || localText === '#'
  const isRgbInProgress = /^rgb/i.test(localText)
  const swatchColor = isValid ? expanded : '#ffffff'

  function handleTextChange(raw: string) {
    if (raw === '') {
      setLocalText('')
      onChange('')
      return
    }
    // Allow typing rgb() values freely — convert immediately if complete, otherwise just store
    if (/^rgb/i.test(raw)) {
      setLocalText(raw)
      const hex = rgbToHex(raw.trim())
      if (hex) onChange(hex)
      return
    }
    // Strip extra leading # chars so pasting "#RRGGBB" into a field showing "#" works
    const stripped = raw.replace(/^#+/, '')
    const normalized = '#' + stripped
    if (normalized.length > 7) return
    setLocalText(normalized)
    const exp = expandShorthand(normalized)
    onChange(isFullHex(exp) ? exp.toUpperCase() : normalized)
  }

  function handleBlur() {
    isFocused.current = false
    // Treat empty or bare "#" as cleared
    if (localText === '' || localText === '#') {
      setLocalText('')
      onChange('')
      return
    }
    // Convert rgb() to hex on blur
    const hex = rgbToHex(localText.trim())
    if (hex) {
      setLocalText(hex)
      onChange(hex)
      return
    }
    // Expand shorthand and uppercase on blur
    const exp = expandShorthand(localText)
    if (isFullHex(exp)) {
      const final = exp.toUpperCase()
      setLocalText(final)
      onChange(final)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text').trim()
    // Convert pasted rgb() value to hex
    const rgbHex = rgbToHex(pasted)
    if (rgbHex) {
      e.preventDefault()
      setLocalText(rgbHex)
      onChange(rgbHex)
      return
    }
    // If the pasted content looks like a standalone hex code, replace the whole input
    const match = pasted.match(/^#?([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$/)
    if (match) {
      e.preventDefault()
      const full = expandShorthand('#' + match[1]).toUpperCase()
      setLocalText(full)
      onChange(full)
    }
    // Otherwise fall through — handleTextChange will normalize the result
  }

  function handleSwatchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value.toUpperCase()
    setLocalText(v)
    onChange(v)
  }

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
          style={{ backgroundColor: swatchColor }}
          aria-label={`Pick ${label} color`}
        />
        <input
          ref={inputRef}
          type="color"
          value={swatchColor}
          onChange={handleSwatchChange}
          className="sr-only"
          tabIndex={-1}
        />
        <input
          type="text"
          value={localText}
          onChange={e => handleTextChange(e.target.value)}
          onFocus={() => { isFocused.current = true }}
          onBlur={handleBlur}
          onPaste={handlePaste}
          placeholder="#000000"
          className={cn(
            'w-full rounded-md border bg-zinc-50 px-3 py-2 text-sm font-mono focus:border-zinc-400 focus:outline-none',
            isEmpty || isValid || isShort || isRgbInProgress ? 'border-zinc-200' : 'border-red-300'
          )}
        />
      </div>
    </div>
  )
}
