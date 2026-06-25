'use client'

import { useState, useEffect, useRef } from 'react'
import type { CompetitorMetadata } from '@/types/feed'

interface ClearbitSuggestion {
  name: string
  domain: string
  logo: string
}

interface CompetitorInputProps {
  competitors: string[]
  onChange: (competitors: string[]) => void
  competitorMetadata?: CompetitorMetadata
  onMetadataChange?: (metadata: CompetitorMetadata) => void
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'X / Twitter',
  linkedin: 'LinkedIn',
  instagram: 'Instagram',
  youtube: 'YouTube',
  facebook: 'Facebook',
  tiktok: 'TikTok',
  threads: 'Threads',
  pinterest: 'Pinterest',
  newsletter: 'Newsletter',
  substack: 'Substack',
  rss: 'RSS',
}

// Channels we actively ingest content from today. Everything else is discovered
// and saved, but not yet monitored — the UI must not imply otherwise.
const TRACKED_CHANNELS = new Set(['twitter', 'linkedin', 'instagram', 'youtube', 'facebook', 'rss'])

export function CompetitorInput({ competitors, onChange, competitorMetadata = {}, onMetadataChange }: CompetitorInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [suggestions, setSuggestions] = useState<ClearbitSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [discovering, setDiscovering] = useState<Record<string, boolean>>({})
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

  async function discoverSocials(domain: string) {
    if (competitorMetadata[domain]) return // already discovered
    setDiscovering(d => ({ ...d, [domain]: true }))
    try {
      const res = await fetch(`/api/competitors/social-discovery?url=${encodeURIComponent(domain)}`)
      if (res.ok) {
        const data = await res.json()
        onMetadataChange?.({
          ...competitorMetadata,
          [domain]: {
            name: data.name ?? domain,
            rss_url: data.rss_url ?? undefined,
            newsletter_url: data.newsletter_url ?? undefined,
            substack_url: data.substack_url ?? undefined,
            socials: data.socials ?? {},
            candidate_channels: data.candidate_channels ?? {},
            confidence: data.confidence ?? {},
          },
        })
      }
    } catch {
      // Non-fatal
    } finally {
      setDiscovering(d => ({ ...d, [domain]: false }))
    }
  }

  function addCompetitor(raw: string) {
    const domain = normalizeDomain(raw)
    if (!domain) return
    if (!competitors.includes(domain)) {
      onChange([...competitors, domain])
      discoverSocials(domain)
    }
    setInputValue('')
    setSuggestions([])
    setIsOpen(false)
    setActiveSuggestion(-1)
  }

  function removeCompetitor(domain: string) {
    onChange(competitors.filter(c => c !== domain))
    if (onMetadataChange) {
      const updated = { ...competitorMetadata }
      delete updated[domain]
      onMetadataChange(updated)
    }
  }

  // Promote a "needs review" candidate into the verified record (user-confirmed).
  function confirmCandidate(domain: string, channel: string) {
    const meta = competitorMetadata[domain]
    const cand = meta?.candidate_channels?.[channel as keyof typeof meta.candidate_channels]
    if (!meta || !cand) return

    const candidates = { ...(meta.candidate_channels ?? {}) }
    delete candidates[channel as keyof typeof candidates]
    const confidence = { ...(meta.confidence ?? {}) }
    confidence[channel as keyof typeof confidence] = { ...cand, status: 'verified', source: 'user_confirmed' }

    const entry = { ...meta, candidate_channels: candidates, confidence }
    if (channel === 'newsletter') entry.newsletter_url = cand.url
    else if (channel === 'substack') entry.substack_url = cand.url
    else if (channel === 'rss') entry.rss_url = cand.url
    else entry.socials = { ...(meta.socials ?? {}), [channel]: cand.url }

    onMetadataChange?.({ ...competitorMetadata, [domain]: entry })
  }

  function dismissCandidate(domain: string, channel: string) {
    const meta = competitorMetadata[domain]
    if (!meta?.candidate_channels) return
    const candidates = { ...meta.candidate_channels }
    delete candidates[channel as keyof typeof candidates]
    onMetadataChange?.({ ...competitorMetadata, [domain]: { ...meta, candidate_channels: candidates } })
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
      removeCompetitor(competitors[competitors.length - 1])
    }
  }

  return (
    <div>
      {/* Added domain pills */}
      {competitors.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
          {competitors.map(domain => {
            const meta = competitorMetadata[domain]
            const socials = meta?.socials ?? {}
            const isDiscovering = discovering[domain]

            // Verified channels — safe to show as real, monitored or saved.
            const verifiedEntries: [string, string][] = [
              ...Object.entries(socials).filter(([, url]) => !!url),
              ...(meta?.rss_url ? [['rss', meta.rss_url]] : []),
              ...(meta?.newsletter_url ? [['newsletter', meta.newsletter_url]] : []),
              ...(meta?.substack_url ? [['substack', meta.substack_url]] : []),
            ] as [string, string][]

            // Unverified candidates — surfaced for the user to confirm or dismiss.
            const candidateEntries = Object.entries(meta?.candidate_channels ?? {})
              .filter(([, ev]) => !!ev?.url) as [string, { url: string; reason?: string }][]

            return (
              <div key={domain}>
                {/* Domain pill */}
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 10px',
                  borderRadius: '20px',
                  backgroundColor: '#ede9fe',
                  color: '#4f46e5',
                  fontSize: '13px',
                  fontWeight: 500,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`}
                    width={14}
                    height={14}
                    alt=""
                    style={{ borderRadius: '2px' }}
                  />
                  {meta?.name && meta.name !== domain ? (
                    <><strong>{meta.name}</strong> <span style={{ opacity: 0.7, fontSize: '12px' }}>({domain})</span></>
                  ) : domain}
                  <button
                    onClick={() => removeCompetitor(domain)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontSize: '15px', lineHeight: 1, padding: '0', display: 'flex', alignItems: 'center' }}
                    aria-label={`Remove ${domain}`}
                  >
                    ×
                  </button>
                </span>

                {/* Discovered properties */}
                {isDiscovering && (
                  <span style={{ display: 'inline-block', marginLeft: '8px', fontSize: '11px', color: '#9ca3af' }}>
                    Discovering channels…
                  </span>
                )}

                {/* Verified channels — Tracked (monitored) vs Discovered (saved, not yet monitored) */}
                {!isDiscovering && verifiedEntries.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px', paddingLeft: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#9ca3af', alignSelf: 'center' }}>Channels:</span>
                    {verifiedEntries.map(([channel, url]) => {
                      const tracked = TRACKED_CHANNELS.has(channel)
                      return (
                        <a
                          key={channel}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={tracked ? 'Tracked — Clout monitors this channel' : 'Discovered — saved, not yet monitored'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                            backgroundColor: tracked ? '#dcfce7' : '#f3f4f6',
                            color: tracked ? '#166534' : '#6b7280',
                            textDecoration: 'none',
                            border: `1px solid ${tracked ? '#bbf7d0' : '#e5e7eb'}`,
                          }}
                        >
                          {PLATFORM_LABELS[channel] ?? channel}
                          {tracked ? ' ✓' : ''}
                        </a>
                      )
                    })}
                  </div>
                )}

                {/* Needs review — unverified candidates with confirm / dismiss */}
                {!isDiscovering && candidateEntries.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '5px', paddingLeft: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#b45309', alignSelf: 'center' }}>Needs review:</span>
                    {candidateEntries.map(([channel, ev]) => (
                      <span
                        key={channel}
                        title={ev.reason ?? 'Possible channel — confirm if this is the right account'}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '2px 6px 2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500,
                          backgroundColor: '#fffbeb', color: '#92400e',
                          border: '1px dashed #fcd34d',
                        }}
                      >
                        <a
                          href={ev.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#92400e', textDecoration: 'none' }}
                        >
                          {PLATFORM_LABELS[channel] ?? channel}
                        </a>
                        <button
                          onClick={() => confirmCandidate(domain, channel)}
                          aria-label={`Confirm ${PLATFORM_LABELS[channel] ?? channel}`}
                          title="Confirm — this is the right account"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontSize: '13px', lineHeight: 1, padding: 0 }}
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => dismissCandidate(domain, channel)}
                          aria-label={`Dismiss ${PLATFORM_LABELS[channel] ?? channel}`}
                          title="Dismiss — not the right account"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', fontSize: '13px', lineHeight: 1, padding: 0 }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {!isDiscovering && !meta && (
                  <button
                    onClick={() => discoverSocials(domain)}
                    style={{ marginLeft: '8px', fontSize: '11px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                  >
                    Discover channels
                  </button>
                )}
              </div>
            )
          })}
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
                    {s.name}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#9ca3af' }}>
                    {s.domain}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '10px', marginBottom: 0 }}>
        Enter competitor website URLs — Clout tracks their content strategy and surfaces blog posts in the Competitive Landscape tab. Optional.
      </p>
    </div>
  )
}
