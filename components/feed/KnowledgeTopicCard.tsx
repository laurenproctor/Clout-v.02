'use client'

import { useRouter } from 'next/navigation'
import type { KnowledgeTopic } from '@/types/feed'

const CATEGORY_STYLES: Record<KnowledgeTopic['category'], { bg: string; color: string; label: string }> = {
  foundational: { bg: '#dbeafe', color: '#1e40af', label: 'Foundational' },
  advanced:     { bg: '#ede9fe', color: '#4f46e5', label: 'Advanced' },
  emerging:     { bg: '#dcfce7', color: '#166534', label: 'Emerging' },
  debate:       { bg: '#fef3c7', color: '#92400e', label: 'Debate' },
  thinker:      { bg: '#f0fdf4', color: '#166534', label: 'Thinker' },
}

const IMPORTANCE_STYLES: Record<KnowledgeTopic['importance_level'], { bg: string; color: string }> = {
  essential:   { bg: '#fef9c3', color: '#854d0e' },
  important:   { bg: '#f3f4f6', color: '#374151' },
  specialized: { bg: '#f0f9ff', color: '#0369a1' },
  emerging:    { bg: '#dcfce7', color: '#166534' },
}

interface KnowledgeTopicCardProps {
  topic: KnowledgeTopic
  workspaceSlug: string
  featured?: boolean
}

export function KnowledgeTopicCard({ topic, workspaceSlug, featured = false }: KnowledgeTopicCardProps) {
  const router = useRouter()
  const cat = CATEGORY_STYLES[topic.category]
  const imp = IMPORTANCE_STYLES[topic.importance_level]

  const handleGenerate = () => {
    const ctx = [
      `Topic: ${topic.title}`,
      `\nSummary: ${topic.summary}`,
      `\nFrameworks: ${topic.frameworks.join(', ')}`,
      `\nKey Thinkers: ${topic.thinkers.join(', ')}`,
      `\nContent angles: ${topic.content_angles.join(', ')}`,
    ].join('\n')
    router.push(`/${workspaceSlug}/capture/new?mode=write&content=${encodeURIComponent(ctx)}`)
  }

  const isThinker = topic.category === 'thinker'

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: featured ? '12px' : '8px',
      backgroundColor: '#fff',
      padding: featured ? '24px' : '16px',
      marginBottom: '10px',
      boxShadow: featured ? '0 1px 4px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      {/* Top row: category badge + importance level + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
            backgroundColor: cat.bg, color: cat.color, padding: '2px 8px', borderRadius: '4px',
          }}>
            {cat.label}
          </span>
          <span style={{
            fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px',
            backgroundColor: imp.bg, color: imp.color, padding: '2px 7px', borderRadius: '4px',
          }}>
            {topic.importance_level}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Importance: <strong style={{ color: '#374151' }}>{topic.importance_score}</strong>
        </span>
      </div>

      {/* Title */}
      <h3 style={{
        fontSize: featured ? '20px' : '15px',
        fontWeight: 600,
        color: '#111827',
        margin: '0 0 8px',
        lineHeight: '1.4',
      }}>
        {topic.title}
      </h3>

      {/* Summary */}
      <p style={{
        fontSize: featured ? '14px' : '13px',
        color: '#4b5563',
        margin: '0 0 12px',
        lineHeight: '1.6',
        ...(featured ? {} : {
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }),
      }}>
        {topic.summary}
      </p>

      {isThinker ? (
        /* Thinker variant */
        <>
          {topic.frameworks.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '6px' }}>Known for:</span>
              <span style={{ fontSize: '12px', color: '#374151', fontWeight: 500 }}>{topic.frameworks[0]}</span>
            </div>
          )}
          {topic.frameworks.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '2px', alignSelf: 'center' }}>Core ideas:</span>
              {topic.frameworks.slice(1).map(f => (
                <span key={f} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f3f4f6', color: '#374151', fontWeight: 500 }}>
                  {f}
                </span>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Standard topic variant */
        <>
          {topic.frameworks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '2px' }}>Frameworks:</span>
              {topic.frameworks.slice(0, 4).map(f => (
                <span key={f} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f0f9ff', color: '#0369a1', fontWeight: 500 }}>
                  {f}
                </span>
              ))}
            </div>
          )}
          {topic.thinkers.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '2px' }}>Thinkers:</span>
              {topic.thinkers.slice(0, 3).map(t => (
                <span key={t} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#fdf4ff', color: '#7e22ce', fontWeight: 500 }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {topic.debates.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '4px' }}>Current debate:</span>
              <span style={{ fontSize: '11px', color: '#374151', fontStyle: 'italic' }}>{topic.debates[0]}</span>
            </div>
          )}
        </>
      )}

      {/* Related topics */}
      {topic.related_topics.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', marginRight: '2px' }}>Related:</span>
          {topic.related_topics.slice(0, 4).map(r => (
            <span key={r} style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 500 }}>
              {r}
            </span>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => router.push(`/${workspaceSlug}/knowledge/${topic.id}`)}
          style={{
            padding: '5px 14px', fontSize: '12px', fontWeight: 500,
            backgroundColor: 'transparent', color: '#374151',
            border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          Learn
        </button>
        <button
          onClick={handleGenerate}
          style={{
            padding: '5px 14px', fontSize: '12px', fontWeight: 600,
            backgroundColor: 'var(--workspace-accent, #1a1560)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          Generate Content
        </button>
      </div>
    </div>
  )
}
