'use client'

import { useState } from 'react'

const SUGGESTED_TOPICS = [
  'AI infrastructure',
  'Retail intelligence',
  'Healthcare systems',
  'Climate technology',
  'Consumer behavior',
  'Marketing strategy',
  'Supply chain',
  'Robotics',
  'Venture capital',
  'Manufacturing',
  'Future of work',
]

interface TopicSelectorProps {
  selected: string[]
  onChange: (topics: string[]) => void
}

export function TopicSelector({ selected, onChange }: TopicSelectorProps) {
  const [query, setQuery] = useState('')

  const filtered = SUGGESTED_TOPICS.filter(t =>
    t.toLowerCase().includes(query.toLowerCase())
  )
  const canAddCustom = query.trim().length > 0 &&
    !SUGGESTED_TOPICS.some(t => t.toLowerCase() === query.trim().toLowerCase()) &&
    !selected.includes(query.trim())

  function toggleTopic(topic: string) {
    if (selected.includes(topic)) {
      onChange(selected.filter(t => t !== topic))
    } else if (selected.length < 10) {
      onChange([...selected, topic])
    }
  }

  function addCustomTopic() {
    const name = query.trim()
    if (name && !selected.includes(name) && selected.length < 10) {
      onChange([...selected, name])
      setQuery('')
    }
  }

  function addBulkTopics(raw: string) {
    const topics = raw
      .split(/[\n,]+/)
      .map(t => t.trim())
      .filter(t => t.length > 0)
    const toAdd = topics.filter(t => !selected.includes(t))
    const remaining = 10 - selected.length
    if (toAdd.length > 0) onChange([...selected, ...toAdd.slice(0, remaining)])
    setQuery('')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    if (val.includes(',') || val.includes('\n')) {
      addBulkTopics(val)
    } else {
      setQuery(val)
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text')
    if (text.includes(',') || text.includes('\n')) {
      e.preventDefault()
      addBulkTopics(text)
    }
  }

  const atMax = selected.length >= 10
  const countColor = selected.length < 3 ? '#ef4444' : '#9ca3af'

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onPaste={handlePaste}
        onKeyDown={e => { if (e.key === 'Enter') addCustomTopic() }}
        placeholder="Search or type topics — paste a comma-separated list to add many at once"
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '14px',
          color: '#111827',
          outline: 'none',
          marginBottom: '16px',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
        {/* Custom "add" chip */}
        {canAddCustom && (
          <button
            onClick={addCustomTopic}
            style={{
              padding: '7px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              border: '2px dashed #4f46e5',
              backgroundColor: '#ede9fe',
              color: '#4f46e5',
            }}
          >
            + Add "{query.trim()}"
          </button>
        )}

        {/* Suggested chips */}
        {filtered.map(topic => {
          const isSelected = selected.includes(topic)
          const isDisabled = !isSelected && atMax

          return (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              disabled={isDisabled}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isDisabled ? 'default' : 'pointer',
                border: isSelected ? '1px solid #1a1560' : '1px solid #e5e7eb',
                backgroundColor: isSelected ? '#1a1560' : isDisabled ? '#f9fafb' : '#fff',
                color: isSelected ? '#fff' : isDisabled ? '#9ca3af' : '#374151',
                transition: 'all 0.12s ease',
              }}
            >
              {topic}
            </button>
          )
        })}

        {/* Selected custom topics not in suggested list */}
        {selected
          .filter(t => !SUGGESTED_TOPICS.includes(t))
          .map(topic => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                border: '1px solid #1a1560',
                backgroundColor: '#1a1560',
                color: '#fff',
              }}
            >
              {topic}
            </button>
          ))
        }
      </div>

      <p style={{ fontSize: '12px', color: countColor, margin: 0 }}>
        {selected.length} selected · 3 minimum, 10 maximum
      </p>
    </div>
  )
}
