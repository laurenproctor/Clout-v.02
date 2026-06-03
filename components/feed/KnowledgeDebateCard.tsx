'use client'

import { useRouter } from 'next/navigation'
import type { KnowledgeTopic } from '@/types/feed'

interface KnowledgeDebateCardProps {
  topic: KnowledgeTopic
  workspaceSlug: string
}

export function KnowledgeDebateCard({ topic, workspaceSlug }: KnowledgeDebateCardProps) {
  const router = useRouter()

  const handleGenerateContrarian = () => {
    const ctx = [
      `Debate: ${topic.title}`,
      `\nSummary: ${topic.summary}`,
      topic.debate_for?.length ? `\nArguments For:\n${topic.debate_for.map(a => `• ${a}`).join('\n')}` : '',
      topic.debate_against?.length ? `\nArguments Against:\n${topic.debate_against.map(a => `• ${a}`).join('\n')}` : '',
      `\nKey Thinkers: ${topic.thinkers.join(', ')}`,
    ].filter(Boolean).join('\n')
    router.push(`/${workspaceSlug}/capture/new?mode=write&content=${encodeURIComponent(ctx)}`)
  }

  return (
    <div style={{
      border: '1px solid #fde68a',
      borderRadius: '8px',
      backgroundColor: '#fffbeb',
      padding: '16px',
      marginBottom: '10px',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{
          fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px',
          backgroundColor: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px',
        }}>
          Debate
        </span>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Importance: <strong style={{ color: '#374151' }}>{topic.importance_score}</strong>
        </span>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#111827', margin: '0 0 12px', lineHeight: '1.4' }}>
        {topic.title}
      </h3>

      {/* Arguments */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        {topic.debate_for && topic.debate_for.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Arguments For
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {topic.debate_for.slice(0, 3).map((arg, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5', marginBottom: '4px', paddingLeft: '12px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#166534' }}>•</span>
                  {arg}
                </li>
              ))}
            </ul>
          </div>
        )}
        {topic.debate_against && topic.debate_against.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Arguments Against
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {topic.debate_against.slice(0, 3).map((arg, i) => (
                <li key={i} style={{ fontSize: '12px', color: '#374151', lineHeight: '1.5', marginBottom: '4px', paddingLeft: '12px', position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#991b1b' }}>•</span>
                  {arg}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Thinkers + related */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        {topic.thinkers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Thinkers:</span>
            {topic.thinkers.slice(0, 3).map(t => (
              <span key={t} style={{ padding: '2px 7px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#fdf4ff', color: '#7e22ce', fontWeight: 500 }}>
                {t}
              </span>
            ))}
          </div>
        )}
        {topic.related_topics.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Related:</span>
            {topic.related_topics.slice(0, 3).map(r => (
              <span key={r} style={{ padding: '2px 6px', borderRadius: '3px', fontSize: '11px', backgroundColor: '#f3f4f6', color: '#6b7280', fontWeight: 500 }}>
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button
          onClick={() => router.push(`/${workspaceSlug}/knowledge/${topic.id}`)}
          style={{
            padding: '5px 14px', fontSize: '12px', fontWeight: 500,
            backgroundColor: 'transparent', color: '#374151',
            border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          Explore Debate
        </button>
        <button
          onClick={handleGenerateContrarian}
          style={{
            padding: '5px 14px', fontSize: '12px', fontWeight: 600,
            backgroundColor: 'var(--workspace-accent, #1a1560)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
          }}
        >
          Generate Contrarian Content
        </button>
      </div>
    </div>
  )
}
