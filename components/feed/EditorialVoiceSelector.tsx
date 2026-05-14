'use client'

import { mapVoicesToTone } from '@/lib/feed/toneMapping'

const VOICES = [
  { id: 'Analytical',  description: 'Rigorous, data-driven, structured.' },
  { id: 'Contrarian',  description: 'Questions consensus. Finds the counterintuitive truth.' },
  { id: 'Executive',   description: 'Strategic, high-signal, no fluff.' },
  { id: 'Educational', description: 'Translates complexity into clarity.' },
  { id: 'Technical',   description: 'Deep expertise, precision over accessibility.' },
  { id: 'Cultural',    description: 'Reads the social and creative undercurrents.' },
  { id: 'Visionary',   description: 'Future-oriented, pattern-seeing, bold claims.' },
]

const TONE_LABELS: Record<string, string> = {
  authoritative: 'Authoritative',
  conversational: 'Conversational',
  provocative: 'Provocative',
}

interface EditorialVoiceSelectorProps {
  selected: string[]
  onChange: (voices: string[]) => void
}

export function EditorialVoiceSelector({ selected, onChange }: EditorialVoiceSelectorProps) {
  function toggleVoice(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(v => v !== id))
    } else {
      onChange([...selected, id])
    }
  }

  const derivedTone = selected.length > 0 ? mapVoicesToTone(selected) : null

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '10px',
        marginBottom: '16px',
      }}>
        {VOICES.map(({ id, description }) => {
          const isSelected = selected.includes(id)
          return (
            <button
              key={id}
              onClick={() => toggleVoice(id)}
              style={{
                textAlign: 'left',
                padding: '14px 16px',
                borderRadius: '6px',
                border: isSelected ? '2px solid #4f46e5' : '1px solid #e5e7eb',
                backgroundColor: isSelected ? '#ede9fe' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.12s ease',
                position: 'relative',
              }}
            >
              {isSelected && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  color: '#4f46e5',
                  fontSize: '13px',
                  fontWeight: 700,
                }}>✓</span>
              )}
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '4px',
                paddingRight: isSelected ? '20px' : '0',
              }}>
                {id}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: '1.5' }}>
                {description}
              </div>
            </button>
          )
        })}
      </div>

      {/* Derived tone preview */}
      {derivedTone && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          backgroundColor: '#f5f3ff',
          borderRadius: '6px',
          border: '1px solid #e0e7ff',
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280' }}>Your editorial tone:</span>
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#4f46e5',
            textTransform: 'capitalize',
          }}>
            {TONE_LABELS[derivedTone]}
          </span>
        </div>
      )}
    </div>
  )
}
