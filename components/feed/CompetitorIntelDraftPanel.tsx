'use client'

import { useState, useCallback, useEffect } from 'react'
import { tokens } from '@/lib/feed/tokens'
import type { DraftFormat, DraftTone } from '@/types/feed'
import type { CompetitorContentItem } from '@/app/api/competitors/content/route'

const FORMATS: DraftFormat[] = ['linkedin', 'twitter', 'blog', 'newsletter', 'instagram']
const FORMAT_LABELS: Record<DraftFormat, string> = {
  linkedin:   'LinkedIn',
  twitter:    'Twitter',
  blog:       'Blog',
  newsletter: 'Newsletter',
  instagram:  'Instagram',
}
const TONES: DraftTone[] = ['authoritative', 'conversational', 'provocative', 'educational']
const TONE_LABELS: Record<DraftTone, string> = {
  authoritative: 'Authoritative',
  conversational: 'Conversational',
  provocative:   'Provocative',
  educational:   'Educational',
}

const EMPTY_DRAFTS: Record<DraftFormat, string> = {
  linkedin: '', twitter: '', blog: '', newsletter: '', instagram: '',
}

interface CompetitorIntelDraftPanelProps {
  item:    CompetitorContentItem
  isOpen:  boolean
  onClose: () => void
}

export function CompetitorIntelDraftPanel({ item, isOpen, onClose }: CompetitorIntelDraftPanelProps) {
  const [activeFormat, setActiveFormat] = useState<DraftFormat>('linkedin')
  const [activeTone, setActiveTone]     = useState<DraftTone>('authoritative')
  const [draftContent, setDraftContent] = useState<Record<DraftFormat, string>>(EMPTY_DRAFTS)
  const [isLoading, setIsLoading]       = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [copied, setCopied]             = useState(false)

  const fetchDraft = useCallback(async (format: DraftFormat, tone: DraftTone) => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/draft/competitor-intel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          item_id:           item.id,
          item_url:          item.url,
          item_title:        item.title ?? '',
          item_summary:      item.summary,
          item_content:      item.content,
          item_topics:       item.topics,
          competitor_domain: item.competitor_domain,
          format,
          tone,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to generate draft')
      setDraftContent(prev => ({ ...prev, [format]: data.draft }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [item])

  // Auto-fetch LinkedIn/Authoritative on open
  useEffect(() => {
    if (isOpen && !draftContent.linkedin) {
      fetchDraft('linkedin', 'authoritative')
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormatChange = (format: DraftFormat) => {
    setActiveFormat(format)
    if (!draftContent[format]) fetchDraft(format, activeTone)
  }

  const handleToneChange = (tone: DraftTone) => {
    setActiveTone(tone)
    fetchDraft(activeFormat, tone)
  }

  const handleRegenerate = () => {
    setDraftContent(prev => ({ ...prev, [activeFormat]: '' }))
    fetchDraft(activeFormat, activeTone)
  }

  const handleCopy = async () => {
    const text = draftContent[activeFormat]
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleClose = () => {
    setActiveFormat('linkedin')
    setActiveTone('authoritative')
    setDraftContent({ ...EMPTY_DRAFTS })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const currentDraft = draftContent[activeFormat]

  return (
    <div style={{
      backgroundColor: tokens.colors.draftPanelBackground,
      borderTop:       `1px solid ${tokens.colors.draftPanelBorderTop}`,
      padding:         '14px 18px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{
          fontSize:      '11px',
          fontWeight:    700,
          textTransform: 'uppercase',
          letterSpacing: tokens.letterSpacing.draftHeader,
          color:         '#374151',
        }}>
          Generate from Competitor Signal
        </span>
        <button
          onClick={handleClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: tokens.colors.sectionHeaderColor, padding: '0 2px', lineHeight: 1 }}
          aria-label="Close draft panel"
        >
          ×
        </button>
      </div>

      {/* Network tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {FORMATS.map(f => (
          <button
            key={f}
            onClick={() => handleFormatChange(f)}
            style={{
              padding:         '4px 10px',
              fontSize:        '12px',
              fontWeight:      500,
              borderRadius:    '3px',
              border:          'none',
              cursor:          'pointer',
              backgroundColor: activeFormat === f ? 'var(--workspace-accent, #1a1560)' : '#e5e7eb',
              color:           activeFormat === f ? tokens.colors.formatTabActiveText : '#6b7280',
              transition:      'background-color 0.1s',
            }}
          >
            {FORMAT_LABELS[f]}
          </button>
        ))}
      </div>

      {/* Tone selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>Tone:</span>
        <select
          value={activeTone}
          onChange={e => handleToneChange(e.target.value as DraftTone)}
          style={{ fontSize: '12px', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '3px 6px', backgroundColor: '#fff', color: '#374151', cursor: 'pointer' }}
        >
          {TONES.map(t => <option key={t} value={t}>{TONE_LABELS[t]}</option>)}
        </select>
      </div>

      {/* Draft content area */}
      {isLoading ? (
        <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.colors.sectionHeaderColor, fontSize: '13px' }}>
          Drafting perspective...
        </div>
      ) : error ? (
        <div style={{ minHeight: '120px', padding: '12px 0' }}>
          <p style={{ color: '#991b1b', fontSize: '13px', marginBottom: '8px' }}>{error}</p>
          <button
            onClick={() => fetchDraft(activeFormat, activeTone)}
            style={{ padding: '5px 12px', fontSize: '12px', backgroundColor: 'var(--workspace-accent, #1a1560)', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div style={{ whiteSpace: 'pre-wrap', minHeight: '120px', fontSize: '13px', lineHeight: '1.6', color: '#374151', padding: '10px 12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '3px' }}>
          {currentDraft || <span style={{ color: tokens.colors.sectionHeaderColor }}>Generating your draft...</span>}
        </div>
      )}

      {/* Copy + Regenerate — shown only once a draft exists */}
      {currentDraft && !isLoading && !error && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <button
            onClick={handleCopy}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={handleRegenerate}
            style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '3px', cursor: 'pointer' }}
          >
            Regenerate
          </button>
        </div>
      )}

      {/* Attribution */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: tokens.colors.sectionHeaderColor }}>
        <span style={{ display: 'inline-block', width: tokens.dimensions.signalAttrDotSize, height: tokens.dimensions.signalAttrDotSize, borderRadius: '50%', backgroundColor: tokens.colors.signalAttrDot, flexShrink: 0 }} />
        Signal source: Competitor Intelligence · Content generated from signal context
      </div>
    </div>
  )
}
