'use client'

const FOCUS_AREAS = [
  { id: 'emerging_narratives',   title: 'Emerging narratives',   description: 'Spot rising stories before they saturate your niche.' },
  { id: 'competitive_whitespace', title: 'Competitive whitespace', description: 'Find topics your rivals are ignoring.' },
  { id: 'industry_shifts',       title: 'Industry shifts',       description: 'Track macro changes that reshape your market.' },
  { id: 'framework_development', title: 'Framework development', description: 'Build intellectual models that establish authority.' },
  { id: 'contrarian_angles',     title: 'Contrarian angles',     description: 'Identify where consensus thinking is wrong.' },
  { id: 'market_timing',         title: 'Market timing',         description: 'Publish when momentum creates maximum visibility.' },
  { id: 'audience_education',    title: 'Audience education',    description: 'Translate complexity into accessible insight.' },
  { id: 'category_creation',     title: 'Category creation',     description: 'Define a space that others will compete to enter.' },
]

interface FocusAreaSelectorProps {
  selected: string[]
  onChange: (areas: string[]) => void
}

export function FocusAreaSelector({ selected, onChange }: FocusAreaSelectorProps) {
  function toggleArea(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      gap: '10px',
    }}>
      {FOCUS_AREAS.map(({ id, title, description }) => {
        const isSelected = selected.includes(id)
        return (
          <button
            key={id}
            onClick={() => toggleArea(id)}
            style={{
              textAlign: 'left',
              padding: '14px 16px',
              borderRadius: '6px',
              border: isSelected ? '2px solid #1a1560' : '1px solid #e5e7eb',
              backgroundColor: isSelected ? '#f5f3ff' : '#fff',
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              position: 'relative',
            }}
          >
            {isSelected && (
              <span style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                color: '#1a1560',
                fontSize: '14px',
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
              {title}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              lineHeight: '1.5',
            }}>
              {description}
            </div>
          </button>
        )
      })}
    </div>
  )
}
