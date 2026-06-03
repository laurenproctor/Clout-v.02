'use client'

const FILTERS = [
  'All', 'Homepage', 'Services', 'Case Studies', 'Testimonials',
  'Reports', 'Blog Posts', 'Resources', 'Founder Stories', 'Content Gaps',
]

interface WebsiteFiltersProps {
  search: string
  activeFilter: string
  onSearchChange: (v: string) => void
  onFilterChange: (v: string) => void
}

export function WebsiteFilters({ search, activeFilter, onSearchChange, onFilterChange }: WebsiteFiltersProps) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <input
        type="text"
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search opportunities..."
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '13px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          marginBottom: '10px',
          outline: 'none',
          boxSizing: 'border-box',
          color: '#111827',
          backgroundColor: '#fff',
        }}
      />
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => onFilterChange(f)}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              backgroundColor: activeFilter === f ? '#1a1560' : '#f3f4f6',
              color: activeFilter === f ? '#fff' : '#374151',
              transition: 'background-color 0.1s, color 0.1s',
            }}
          >
            {f}
          </button>
        ))}
      </div>
    </div>
  )
}
