import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { DEMO_TOPICS } from '@/lib/knowledge/demo-data'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import type { KnowledgeTopic, KnowledgeResource } from '@/types/feed'
import type { KnowledgeSignalsCache } from '@/lib/knowledge/generate'

interface PageProps {
  params: Promise<{ workspaceSlug: string; topicId: string }>
}

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

const TYPE_LABEL: Record<KnowledgeResource['type'], string> = {
  book:     'Book',
  article:  'Article',
  research: 'Research',
  podcast:  'Podcast',
  video:    'Video',
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
      color: '#9ca3af',
      marginBottom: '12px',
    }}>
      {label}
    </div>
  )
}

export default async function KnowledgeTopicPage({ params }: PageProps) {
  const { workspaceSlug, topicId } = await params

  const session = await getSession()
  if (!session) redirect('/')

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ws } = await (supabase as any)
    .from('workspace_feed_settings')
    .select('knowledge_signals_cache')
    .eq('workspace_id', session.workspaceId)
    .maybeSingle() as { data: { knowledge_signals_cache: KnowledgeSignalsCache | null } | null }

  const cachedTopics: KnowledgeTopic[] = ws?.knowledge_signals_cache?.topics ?? []
  const topic = cachedTopics.find(t => t.id === topicId) ?? DEMO_TOPICS.find(t => t.id === topicId)
  if (!topic) notFound()

  const cat = CATEGORY_STYLES[topic.category]
  const imp = IMPORTANCE_STYLES[topic.importance_level]

  const readingByType = topic.recommended_reading.reduce<Partial<Record<KnowledgeResource['type'], KnowledgeResource[]>>>(
    (acc, r) => { (acc[r.type] ??= []).push(r); return acc },
    {}
  )

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '32px 24px' }}>

      {/* Breadcrumb + badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <Link
          href={`/${workspaceSlug}/feed`}
          style={{ fontSize: '13px', color: '#6b7280', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          ← Knowledge Signals
        </Link>
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
        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>
          Importance: <strong style={{ color: '#374151' }}>{topic.importance_score}</strong>
        </span>
      </div>

      {/* 1. Definition */}
      <section style={{ marginBottom: '36px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 12px', lineHeight: '1.3' }}>
          {topic.title}
        </h1>
        <p style={{ fontSize: '16px', color: '#4b5563', lineHeight: '1.7', margin: 0 }}>
          {topic.summary}
        </p>
      </section>

      {/* 2. Why It Matters */}
      {topic.content_angles.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Why It Matters" />
          <div style={{
            backgroundColor: '#f9fafb',
            borderLeft: '3px solid #1a1560',
            padding: '16px 20px',
            borderRadius: '0 6px 6px 0',
            fontSize: '14px',
            color: '#374151',
            lineHeight: '1.7',
          }}>
            {topic.content_angles[0]}
          </div>
        </section>
      )}

      {/* 3. Debate arguments (debate only) */}
      {topic.category === 'debate' && (topic.debate_for?.length || topic.debate_against?.length) && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="The Debate" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {topic.debate_for && topic.debate_for.length > 0 && (
              <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#166534', letterSpacing: '0.4px', marginBottom: '10px' }}>
                  Arguments For
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {topic.debate_for.map((arg, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', marginBottom: '8px', paddingLeft: '14px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#166534' }}>•</span>
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topic.debate_against && topic.debate_against.length > 0 && (
              <div style={{ border: '1px solid #fecaca', borderRadius: '8px', padding: '16px', backgroundColor: '#fef2f2' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#991b1b', letterSpacing: '0.4px', marginBottom: '10px' }}>
                  Arguments Against
                </div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {topic.debate_against.map((arg, i) => (
                    <li key={i} style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', marginBottom: '8px', paddingLeft: '14px', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 0, color: '#991b1b' }}>•</span>
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 4. Key Frameworks */}
      {topic.frameworks.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label={topic.category === 'thinker' ? 'Known For' : 'Key Frameworks'} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topic.frameworks.map(f => (
              <span key={f} style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#f0f9ff',
                color: '#0369a1',
                border: '1px solid #bae6fd',
              }}>
                {f}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 5. Key Thinkers */}
      {topic.thinkers.length > 0 && topic.category !== 'thinker' && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Key Thinkers" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topic.thinkers.map(t => (
              <span key={t} style={{
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                backgroundColor: '#fdf4ff',
                color: '#7e22ce',
                border: '1px solid #e9d5ff',
              }}>
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 6. Recommended Reading */}
      {topic.recommended_reading.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Recommended Reading" />
          {(Object.entries(readingByType) as [KnowledgeResource['type'], KnowledgeResource[]][]).map(([type, items]) => (
            <div key={type} style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {TYPE_LABEL[type]}s
              </div>
              {items.map((item, i) => (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '6px',
                  backgroundColor: '#fff',
                  gap: '12px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#111827' }}>{item.title}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{item.author}</div>
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        fontSize: '12px',
                        color: '#1a1560',
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      View →
                    </a>
                  )}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* 7. Current Debates */}
      {topic.debates.length > 0 && topic.category !== 'debate' && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Current Debates" />
          {topic.debates.map((d, i) => (
            <div key={i} style={{
              borderLeft: '3px solid #fbbf24',
              padding: '10px 14px',
              marginBottom: '8px',
              backgroundColor: '#fffbeb',
              borderRadius: '0 6px 6px 0',
              fontSize: '13px',
              color: '#374151',
              lineHeight: '1.6',
            }}>
              {d}
            </div>
          ))}
        </section>
      )}

      {/* 8. Frequently Confused With */}
      {topic.frequently_confused_with && topic.frequently_confused_with.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Frequently Confused With" />
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.6' }}>
            These related concepts are often conflated with {topic.title}, but serve distinct purposes.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topic.frequently_confused_with.map(term => (
              <span key={term} style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#fff7ed',
                color: '#9a3412',
                border: '1px solid #fed7aa',
              }}>
                {term}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 9. Related Concepts */}
      {topic.related_topics.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Related Concepts" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topic.related_topics.map(r => (
              <span key={r} style={{
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #e5e7eb',
              }}>
                {r}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 10. Content Opportunities */}
      {topic.content_angles.length > 0 && (
        <section style={{ marginBottom: '36px' }}>
          <SectionHeader label="Content Opportunities" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topic.content_angles.map((angle, i) => {
              const ctx = encodeURIComponent([
                `Topic: ${topic.title}`,
                `\nAngle: ${angle}`,
                `\nSummary: ${topic.summary}`,
                `\nFrameworks: ${topic.frameworks.join(', ')}`,
                `\nKey Thinkers: ${topic.thinkers.join(', ')}`,
              ].join('\n'))
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  backgroundColor: '#fff',
                  gap: '16px',
                }}>
                  <span style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>{angle}</span>
                  <Link
                    href={`/${workspaceSlug}/capture/new?mode=write&content=${ctx}`}
                    style={{
                      padding: '5px 14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: 'var(--workspace-accent, #1a1560)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    Generate
                  </Link>
                </div>
              )
            })}
          </div>
        </section>
      )}

    </div>
  )
}
