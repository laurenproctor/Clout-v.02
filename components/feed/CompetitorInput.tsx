'use client'

import { useState, useEffect, useRef } from 'react'

interface ClearbitSuggestion {
  name: string
  domain: string
  logo: string
}

interface CompetitorInputProps {
  competitors: string[]
  onChange: (competitors: string[]) => void
}

export function CompetitorInput({ competitors, onChange }: CompetitorInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<ClearbitSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const query = inputValue.trim()
    if (!query) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`
        )
        const data: ClearbitSuggestion[] = await res.json()
        setSuggestions(data.slice(0, 5))
        setIsOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [inputValue])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function normalizeDomain(raw: string) {
    return raw.trim().replace(/,$/, '').replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
  }

  function addCompetitor(raw: string) {
    const domain = normalizeDomain(raw)
    if (domain && !competitors.includes(domain)) {
      onChange([...competitors, domain])
    }
    setInputValue('')
    setSuggestions([])
    setIsOpen(false)
    setActiveSuggestion(-1)
  }

  function removeCompetitor(domain: string) {
    onChange(competitors.filter(c => c !== domain))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (isOpen && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveSuggestion(s => Math.min(s + 1, suggestions.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveSuggestion(s => Math.max(s - 1, -1))
        return
      }
      if (e.key === 'Enter' && activeSuggestion >= 0) {
        e.preventDefault()
        addCompetitor(suggestions[activeSuggestion].domain)
        return
      }
      if (e.key === 'Escape') {
        setIsOpen(false)
        setActiveSuggestion(-1)
        return
      }
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      addCompetitor(inputValue)
    }
    if (e.key === 'Backspace' && inputValue === '' && competitors.length > 0) {
      onChange(competitors.slice(0, -1))
    }
  }

  return (
    <div>
      {/* Added domain pills */}
      {competitors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {competitors.map(domain => (
            <span
              key={domain}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 10px',
                borderRadius: '20px',
                backgroundColor: '#ede9fe',
                color: '#4f46e5',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                width={14}
                height={14}
                alt=""
                style={{ borderRadius: '2px' }}
              />
              {domain}
              <button
                onClick={() => removeCompetitor(domain)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7c3aed',
                  fontSize: '15px',
                  lineHeight: 1,
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                }}
                aria-label={`Remove ${domain}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + autocomplete dropdown */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value)
              setActiveSuggestion(-1)
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => suggestions.length > 0 && setIsOpen(true)}
            placeholder="e.g. techcrunch.com"
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#111827',
              outline: 'none',
            }}
          />
          <button
            onClick={() => addCompetitor(inputValue)}
            disabled={!inputValue.trim()}
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: inputValue.trim() ? '#1a1560' : '#f3f4f6',
              color: inputValue.trim() ? '#fff' : '#9ca3af',
              border: 'none',
              borderRadius: '6px',
              cursor: inputValue.trim() ? 'pointer' : 'default',
              transition: 'all 0.1s ease',
              whiteSpace: 'nowrap',
            }}
          >
            Add
          </button>
        </div>

        {isOpen && suggestions.length > 0 && (
          <div
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            {suggestions.map((s, i) => (
              <button
                key={s.domain}
                onMouseDown={e => {
                  e.preventDefault()
                  addCompetitor(s.domain)
                }}
                onMouseEnter={() => setActiveSuggestion(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  background: activeSuggestion === i ? '#f5f3ff' : 'transparent',
                  border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${s.domain}&sz=32`}
                  width={20}
                  height={20}
                  alt=""
                  style={{ borderRadius: '4px', flexShrink: 0 }}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {s.domain}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af' }}>
                    {s.name}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px', marginBottom: 0 }}>
        Enter competitor website URLs — Clout tracks their content strategy to surface gaps you can own. Optional.
      </p>
    </div>
  )
}
