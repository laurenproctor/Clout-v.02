'use client'

import { useState, useRef } from 'react'
import type { WebsiteOpportunity, WebsiteContentGap } from '@/types/feed'
import { WebsiteFeaturedCard } from './WebsiteFeaturedCard'
import { WebsiteOpportunityCard } from './WebsiteOpportunityCard'
import { WebsiteContentGapCard } from './WebsiteContentGapCard'
import { WebsiteFilters } from './WebsiteFilters'

// TODO: Future — surface related Knowledge Signals on website opportunities.
// TODO: Future feed organization — group remaining cards by level: High → Medium → Emerging

const CHIP_TO_SOURCE: Record<string, string> = {
  Homepage:          'Homepage',
  'Case Studies':    'Case Study',
  Testimonials:      'Testimonials',
  Reports:           'Research Report',
  'Blog Posts':      'Blog Post',
  Resources:         'Resource',
  Team:              'Team',
}

// The "Team" chip is broader than a single source_type: it surfaces anything
// founder- or team-related (about pages, founder bios, leadership, culture),
// since the LLM labels this content inconsistently.
const TEAM_KEYWORDS = [
  'team', 'founder', 'co-founder', 'about', 'leadership', 'leader',
  'people', 'staff', 'bio', 'culture', 'mission', 'who we are', 'our story',
]

function isTeamRelated(item: WebsiteOpportunity): boolean {
  const haystack = [item.source_type, item.title, ...item.tags]
    .join(' ')
    .toLowerCase()
  return TEAM_KEYWORDS.some(k => haystack.includes(k))
}

// The "Offering" chip surfaces what the company actually sells — both products
// and services. It spans more than one source_type (Service Page, Product Page,
// pricing/solutions pages), so we can't key off a single value. We match the
// source_type ONLY — not the title or tags — so a tangential blog or marketing
// item that merely mentions a product doesn't get pulled in. The analysis prompt
// labels these pages "Service Page" / "Product Page" (see lib/website-intelligence/analyze.ts).
const OFFERING_SOURCE_KEYWORDS = [
  'service', 'product', 'offering', 'solution', 'pricing',
]

function isOfferingRelated(item: WebsiteOpportunity): boolean {
  const sourceType = (item.source_type ?? '').toLowerCase()
  return OFFERING_SOURCE_KEYWORDS.some(k => sourceType.includes(k))
}

const FILTER_HINTS: Record<string, { message: string; hint: string; placeholder: string }> = {
  Homepage:        { message: 'No homepage content found yet.',     hint: "Paste your homepage URL and we'll scan it for content opportunities.",               placeholder: 'https://yoursite.com' },
  Offering:        { message: 'No products or services found yet.', hint: 'Have a products, services, or pricing page? Paste the URL below and we’ll pull out what you offer.', placeholder: 'https://yoursite.com/services' },
  'Case Studies':  { message: 'No case studies found yet.',         hint: 'Have a case studies page or a case study document? Add it below.',                  placeholder: 'https://yoursite.com/case-studies' },
  Testimonials:    { message: 'No testimonials found yet.',         hint: 'Have a testimonials page or a doc with customer quotes? Add it below.',             placeholder: 'https://yoursite.com/testimonials' },
  Reports:         { message: 'No research reports found yet.',     hint: 'Have a reports or whitepapers page? Paste the URL or upload a PDF.',                placeholder: 'https://yoursite.com/reports' },
  'Blog Posts':    { message: 'No blog posts found yet.',           hint: "Have a blog? Paste the blog URL and we'll identify your best content opportunities.", placeholder: 'https://yoursite.com/blog' },
  Resources:       { message: 'No resources found yet.',            hint: 'Have a resources or downloads page? Paste the URL or upload a file.',               placeholder: 'https://yoursite.com/resources' },
  Team:            { message: 'No team content found yet.',         hint: 'Have an about, team, or leadership page? Add it below.',                            placeholder: 'https://yoursite.com/team' },
}

interface AnalyzeResult {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  websiteUrl: string
}

interface AnalyzeResponse {
  error?: string
  items?: WebsiteOpportunity[]
  gaps?: WebsiteContentGap[]
  website_url?: string
}

// Read a JSON analysis response, turning non-JSON error bodies into a readable
// message. The analysis endpoints can run for minutes; when they exceed the
// serverless time limit the platform returns a plain-text error page, not JSON.
// Calling res.json() on that throws `Unexpected token 'A'...`, hiding the real
// cause — so parse the text ourselves and map timeouts to a useful message.
async function readAnalyzeResponse(res: Response): Promise<AnalyzeResponse> {
  const text = await res.text()
  let data: AnalyzeResponse
  try {
    data = text ? (JSON.parse(text) as AnalyzeResponse) : {}
  } catch {
    throw new Error(
      res.status === 504 || res.status === 502
        ? 'That site has a lot of content and took too long to analyze. Try a more specific page URL (e.g. a single article or section).'
        : `Analysis failed (HTTP ${res.status}). Please try again.`,
    )
  }
  if (!res.ok || data.error) {
    throw new Error(data.error ?? `Analysis failed (HTTP ${res.status}).`)
  }
  return data
}

interface WebsiteIntelligenceFeedProps {
  items: WebsiteOpportunity[]
  gaps: WebsiteContentGap[]
  loading: boolean
  error: string | null
  workspaceSlug: string
  websiteUrl: string | null
  onRetry: () => void
  onUrlSaved: (url: string, result: AnalyzeResult) => void
}

export function WebsiteIntelligenceFeed({
  items,
  gaps,
  loading,
  error,
  workspaceSlug,
  websiteUrl,
  onRetry,
  onUrlSaved,
}: WebsiteIntelligenceFeedProps) {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  // Global connect form (shown when no websiteUrl)
  const [showUrlForm, setShowUrlForm] = useState(false)
  const [urlInput, setUrlInput] = useState(websiteUrl ?? '')
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  // Filter-specific add-source form
  const [addSourceUrl, setAddSourceUrl] = useState('')
  const [addSourceAnalyzing, setAddSourceAnalyzing] = useState(false)
  const [addSourceError, setAddSourceError] = useState<string | null>(null)
  const [uploadAnalyzing, setUploadAnalyzing] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showOnlyGaps = activeFilter === 'Content Gaps'
  const sourceFilter = CHIP_TO_SOURCE[activeFilter] ?? null

  const filteredItems = items.filter(item => {
    if (showOnlyGaps) return false
    if (activeFilter === 'Team') {
      if (!isTeamRelated(item)) return false
    } else if (activeFilter === 'Offering') {
      if (!isOfferingRelated(item)) return false
    } else if (sourceFilter && item.source_type !== sourceFilter) {
      return false
    }
    if (search) {
      const q = search.toLowerCase()
      return item.title.toLowerCase().includes(q) || item.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const filteredGaps = gaps.filter(gap => {
    if (!showOnlyGaps && activeFilter !== 'All' && (sourceFilter || activeFilter === 'Offering')) return false
    if (search) {
      const q = search.toLowerCase()
      return gap.headline.toLowerCase().includes(q) || gap.tags.some(t => t.toLowerCase().includes(q))
    }
    return true
  })

  const featured = filteredItems[0] ?? null
  const rest = filteredItems.slice(1)

  // ── Global analyze (initial connection) ──────────────────────────────────
  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    if (!urlInput.trim()) return

    let url = urlInput.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`

    setAnalyzing(true)
    setAnalyzeError(null)

    try {
      const res = await fetch('/api/website-intelligence/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website_url: url }),
      })
      const data = await readAnalyzeResponse(res)

      setShowUrlForm(false)
      onUrlSaved(url, { items: data.items ?? [], gaps: data.gaps ?? [], websiteUrl: url })
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : 'Analysis failed. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  // ── Add source URL (filter-specific, merge-mode) ─────────────────────────
  async function handleAddSourceUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!addSourceUrl.trim()) return

    let url = addSourceUrl.trim()
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`

    setAddSourceAnalyzing(true)
    setAddSourceError(null)

    try {
      const res = await fetch('/api/website-intelligence/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await readAnalyzeResponse(res)

      setAddSourceUrl('')
      onUrlSaved(data.website_url ?? websiteUrl ?? url, {
        items: data.items ?? [],
        gaps: data.gaps ?? [],
        websiteUrl: data.website_url ?? websiteUrl ?? url,
      })
    } catch (err) {
      setAddSourceError(err instanceof Error ? err.message : 'Could not analyze that URL. Please try again.')
    } finally {
      setAddSourceAnalyzing(false)
    }
  }

  // ── Upload file (filter-specific, merge-mode) ────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadAnalyzing(true)
    setUploadError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('source_name', file.name)

      const res = await fetch('/api/website-intelligence/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error ?? 'Upload failed')

      onUrlSaved(data.website_url ?? websiteUrl ?? '', {
        items: data.items ?? [],
        gaps: data.gaps ?? [],
        websiteUrl: data.website_url ?? websiteUrl ?? '',
      })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.')
    } finally {
      setUploadAnalyzing(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Shared input styles ───────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 12px', fontSize: '13px',
    border: '1px solid #d1d5db', borderRadius: '6px',
    outline: 'none', color: '#111827', minWidth: 0,
  }
  const btnPrimary = (disabled = false): React.CSSProperties => ({
    padding: '8px 18px', fontSize: '13px', fontWeight: 600,
    backgroundColor: disabled ? '#e5e7eb' : 'var(--workspace-accent, #1a1560)',
    color: disabled ? '#9ca3af' : '#fff',
    border: 'none', borderRadius: '6px',
    cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap',
  })

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        Analyzing your website…
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
        <button onClick={onRetry} style={btnPrimary()}>Retry</button>
      </div>
    )
  }

  // ── Global empty state (no websiteUrl) ────────────────────────────────────
  const hasAnyData = items.length > 0 || gaps.length > 0
  const globalEmpty = !websiteUrl || (!hasAnyData && activeFilter === 'All' && !search)

  if (globalEmpty || analyzing) {
    return (
      <div style={{ padding: '64px 0', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: '48px', height: '48px', borderRadius: '12px',
          backgroundColor: '#f3f4f6', marginBottom: '20px',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>

        {analyzing ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Analyzing your website…</p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px', margin: '0 auto', lineHeight: '1.6' }}>
              We&apos;re crawling your site and identifying content opportunities from your posts. This can take a minute or two.
            </p>
          </>
        ) : !websiteUrl ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Connect your website</p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              Set your website URL in feed settings. We&apos;ll automatically analyze your content here and surface high-impact opportunities from your own posts.
            </p>
            <a href={`/${workspaceSlug}/settings/feed`} style={{ ...btnPrimary(), textDecoration: 'none', display: 'inline-block' }}>Go to feed settings</a>
          </>
        ) : showUrlForm ? (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Re-analyze your website</p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '360px', margin: '0 auto 20px', lineHeight: '1.6' }}>
              We&apos;ll re-crawl your site and refresh your content opportunities.
            </p>
            <form onSubmit={handleAnalyze} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', maxWidth: '420px', margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://yourwebsite.com" autoFocus style={inputStyle} />
                <button type="submit" disabled={!urlInput.trim()} style={btnPrimary(!urlInput.trim())}>Analyze</button>
              </div>
              {analyzeError && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{analyzeError}</p>}
              <button type="button" onClick={() => { setShowUrlForm(false); setAnalyzeError(null) }} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
            </form>
          </>
        ) : (
          <>
            <p style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No opportunities found yet.</p>
            <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '380px', margin: '0 auto 24px', lineHeight: '1.6' }}>
              We analyzed <strong>{websiteUrl}</strong> but didn&apos;t surface opportunities. Re-analyze, or update your website in feed settings.
            </p>
            <button onClick={() => { setShowUrlForm(true); setUrlInput(websiteUrl ?? '') }} style={btnPrimary()}>Re-analyze Website</button>
          </>
        )}
      </div>
    )
  }

  // ── Layout: header + filters + content ───────────────────────────────────
  const filterEmpty = activeFilter !== 'All' && !showOnlyGaps && filteredItems.length === 0
  const gapFilterEmpty = showOnlyGaps && filteredGaps.length === 0
  const hint = FILTER_HINTS[activeFilter]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>Website Intelligence</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>Scored content opportunities from your existing website assets</p>
        </div>
        <button
          onClick={() => { setShowUrlForm(true); setUrlInput(websiteUrl ?? '') }}
          style={{ padding: '5px 12px', fontSize: '12px', fontWeight: 500, backgroundColor: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}
        >
          Re-analyze
        </button>
      </div>

      {/* Inline re-analyze form */}
      {showUrlForm && (
        <form onSubmit={handleAnalyze} style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="text" value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://yourwebsite.com" autoFocus style={inputStyle} />
          <button type="submit" disabled={!urlInput.trim() || analyzing} style={btnPrimary(!urlInput.trim() || analyzing)}>
            {analyzing ? 'Analyzing…' : 'Analyze'}
          </button>
          <button type="button" onClick={() => { setShowUrlForm(false); setAnalyzeError(null) }} style={{ fontSize: '12px', color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>Cancel</button>
          {analyzeError && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>{analyzeError}</p>}
        </form>
      )}

      {/* Filters */}
      <WebsiteFilters search={search} activeFilter={activeFilter} onSearchChange={setSearch} onFilterChange={(f) => { setActiveFilter(f); setAddSourceUrl(''); setAddSourceError(null); setUploadError(null) }} />

      {/* ── Filter-specific empty state ───────────────────────── */}
      {(filterEmpty || gapFilterEmpty) && (
        <div style={{ padding: '40px 24px', textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: '10px', backgroundColor: '#fafafa' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
            {gapFilterEmpty
              ? 'No content gaps identified yet.'
              : hint?.message ?? `No ${activeFilter.toLowerCase()} found yet.`}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', maxWidth: '420px', margin: '0 auto 20px', lineHeight: '1.6' }}>
            {gapFilterEmpty
              ? 'Content gaps appear once your website has been analyzed. Run a full analysis or add a specific page above.'
              : hint?.hint ?? `If you have a dedicated page for this content type, paste the URL below.`}
          </p>

          {!gapFilterEmpty && (
            <>
              {/* URL input */}
              <form onSubmit={handleAddSourceUrl} style={{ maxWidth: '460px', margin: '0 auto 12px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={addSourceUrl}
                    onChange={e => setAddSourceUrl(e.target.value)}
                    placeholder={hint?.placeholder ?? 'https://yoursite.com/page'}
                    disabled={addSourceAnalyzing || uploadAnalyzing}
                    style={inputStyle}
                  />
                  <button
                    type="submit"
                    disabled={!addSourceUrl.trim() || addSourceAnalyzing || uploadAnalyzing}
                    style={btnPrimary(!addSourceUrl.trim() || addSourceAnalyzing || uploadAnalyzing)}
                  >
                    {addSourceAnalyzing ? 'Analyzing…' : 'Analyze page'}
                  </button>
                </div>
                {addSourceError && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px', textAlign: 'left' }}>{addSourceError}</p>}
              </form>

              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '460px', margin: '0 auto 12px' }}>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>or upload a file</span>
                <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              </div>

              {/* File upload */}
              <div style={{ maxWidth: '460px', margin: '0 auto' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv"
                  onChange={handleFileUpload}
                  disabled={addSourceAnalyzing || uploadAnalyzing}
                  style={{ display: 'none' }}
                  id="website-intel-upload"
                />
                <label
                  htmlFor="website-intel-upload"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    padding: '8px 16px', fontSize: '13px', fontWeight: 500,
                    border: '1px solid #d1d5db', borderRadius: '6px', backgroundColor: '#fff',
                    color: uploadAnalyzing ? '#9ca3af' : '#374151',
                    cursor: uploadAnalyzing || addSourceAnalyzing ? 'default' : 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {uploadAnalyzing ? 'Uploading…' : 'Upload PDF, DOC, or TXT'}
                </label>
                {uploadError && <p style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>{uploadError}</p>}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Normal cards ─────────────────────────────────────── */}
      {!filterEmpty && !gapFilterEmpty && (
        <>
          {featured && !showOnlyGaps && (
            <WebsiteFeaturedCard opportunity={featured} workspaceSlug={workspaceSlug} />
          )}

          {filteredGaps.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#92400e', margin: '0 0 10px' }}>
                Content Gaps
              </h3>
              {filteredGaps.map(gap => (
                <WebsiteContentGapCard key={gap.id} gap={gap} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          )}

          {rest.length > 0 && (
            <div>
              {!showOnlyGaps && (
                <h3 style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9ca3af', margin: '0 0 10px' }}>
                  More Opportunities
                </h3>
              )}
              {rest.map(opp => (
                <WebsiteOpportunityCard key={opp.id} opportunity={opp} workspaceSlug={workspaceSlug} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
