'use client'

import { useState } from 'react'

interface CompetitorInputProps {
  competitors: string[]
  onChange: (competitors: string[]) => void
}

export function CompetitorInput({ competitors, onChange }: CompetitorInputProps) {
  const [inputValue, setInputValue] = useState('')

  function addCompetitor(raw: string) {
    const name = raw.trim().replace(/,$/, '')
    if (name && !competitors.includes(name)) {
      onChange([...competitors, name])
    }
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCompetitor(inputValue)
    }
    if (e.key === 'Backspace' && inputValue === '' && competitors.length > 0) {
      onChange(competitors.slice(0, -1))
    }
  }

  function removeCompetitor(name: string) {
    onChange(competitors.filter(c => c !== name))
  }

  return (
    <div>
      {/* Existing pills */}
      {competitors.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {competitors.map(name => (
            <span
              key={name}
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
              {name}
              <button
                onClick={() => removeCompetitor(name)}
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
                aria-label={`Remove ${name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input + Add button */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a competitor name and press Enter"
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
          }}
        >
          Add
        </button>
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px', marginBottom: 0 }}>
        Add the names or brands competing for your audience&apos;s attention. This step is optional.
      </p>
    </div>
  )
}
