'use client'

import { useMemo, useState, useRef } from 'react'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { SocialPreviewInline, previewFromStudioState } from '@/components/social-preview'
import { CampaignSelect } from '@/components/create/CampaignSelect'
import type { SubstackGenerationRequest, SubstackGeneratedArticle, SubstackGenerationEvent } from '@/lib/substack/types'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import { SUBSTACK_LENGTH_TARGETS, SUBSTACK_ARTICLE_TYPES } from '@/lib/syndication/platforms/substack'

interface Lens { id: string; name: string }

interface SubstackWorkspaceProps {
  lenses:               Lens[]
  substackConnections:  ProviderConnectionSafe[]
  workspaceSlug:        string
}

type WorkspaceState = 'setup' | 'generating' | 'result'

interface DraftResult {
  providerContentId: string
  providerUrl:       string
}

export function SubstackWorkspace({ lenses, substackConnections, workspaceSlug }: SubstackWorkspaceProps) {

  const [state,         setState]         = useState<WorkspaceState>('setup')
  const [sourceContent, setSourceContent] = useState('')
  const [length,        setLength]        = useState<SubstackGenerationRequest['length']>('standard')
  const [articleType,   setArticleType]   = useState<SubstackGenerationRequest['articleType']>('essay')
  const [selectedLens,  setSelectedLens]  = useState<string | null>(lenses[0]?.id ?? null)
  const [campaignId,    setCampaignId]    = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState('')
  const [generated,     setGenerated]     = useState<SubstackGeneratedArticle | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  const [selectedConnection, setSelectedConnection] = useState<string>(substackConnections[0]?.id ?? '')
  const [savingDraft,        setSavingDraft]        = useState(false)
  const [draftResult,        setDraftResult]        = useState<DraftResult | null>(null)
  const [draftError,         setDraftError]         = useState<string | null>(null)

  // Auto-save to Studio (parallel to the optional direct-to-Substack save). Idempotent:
  // a client ref blocks double-fires and the server dedupes on a generation hash.
  const [savedStudioDraftId, setSavedStudioDraftId] = useState<string | null>(null)
  const [studioSaveStatus,   setStudioSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const savingStudioDraftRef = useRef(false)

  const abortRef = useRef<AbortController | null>(null)

  // Live network preview (Substack). Built at top level so hook order is stable
  // across the setup/generating/result branches.
  const previewData = useMemo(
    () =>
      previewFromStudioState({
        platform: 'substack',
        channel: null,
        accountName: substackConnections.find(c => c.id === selectedConnection)?.label,
        title: generated?.title,
        body: generated ? articlePlainText(generated) : '',
      }),
    [generated, selectedConnection, substackConnections],
  )

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceContent.trim()) return

    setError(null)
    setGenerated(null)
    setDraftResult(null)
    setDraftError(null)
    // Reset Studio auto-save guards for the new generation.
    setSavedStudioDraftId(null)
    setStudioSaveStatus('idle')
    savingStudioDraftRef.current = false
    setState('generating')
    setProgressLabel('Preparing…')

    abortRef.current = new AbortController()

    const request: SubstackGenerationRequest = {
      sourceType:    'text',
      sourceContent: sourceContent.trim(),
      lensIds:       selectedLens ? [selectedLens] : [],
      articleType,
      length,
      campaignId,
    }

    try {
      const res = await fetch('/api/substack/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // campaignId is read at the top level by the route.
        body:    JSON.stringify({ request, campaignId: request.campaignId ?? null }),
        signal:  abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setError(data.error ?? 'Generation failed.')
        setState('setup')
        return
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as SubstackGenerationEvent
            if (event.type === 'progress') setProgressLabel(event.label)
            if (event.type === 'error')    { setError(event.message); setState('setup'); return }
            if (event.type === 'complete') {
              setGenerated(event.data)
              setState('result')
              // Auto-save to Studio from the FINALIZED generation object (not React
              // state, which can lag a render and yield a truncated article).
              void saveStudioDraft(event.data)
            }
          } catch { /* malformed line — skip */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setState('setup')
        return
      }
      setError(err instanceof Error ? err.message : 'Network error.')
      setState('setup')
    }
  }

  async function handleSaveDraft() {
    if (!generated || !selectedConnection) return
    setSavingDraft(true)
    setDraftError(null)

    const article: CanonicalArticle = {
      ...generated.article,
      excerpt: generated.subtitle ?? generated.article.excerpt,
    }

    try {
      const res = await fetch('/api/publishing/publish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          connectionId: selectedConnection,
          article,
          opts: {
            status:          'draft',
            overrideExcerpt: generated.subtitle,
          },
          sourceType: 'manual',
        }),
      })

      const data = await res.json() as { providerContentId?: string; providerUrl?: string; error?: string }
      if (!res.ok) {
        setDraftError(data.error ?? 'Failed to save draft.')
        return
      }

      setDraftResult({
        providerContentId: data.providerContentId ?? '',
        providerUrl:       data.providerUrl ?? '',
      })
    } catch {
      setDraftError('Network error. Please try again.')
    } finally {
      setSavingDraft(false)
    }
  }

  // Promote the generated article to a Studio draft (content_type 'substack-newsletter',
  // tagged as a Substack Article). Non-blocking and idempotent.
  async function saveStudioDraft(gen: SubstackGeneratedArticle) {
    if (savingStudioDraftRef.current || savedStudioDraftId) return
    const markdown = (gen.markdown?.trim() || articlePlainText(gen)).trim()
    if (!markdown) { setStudioSaveStatus('error'); return }

    savingStudioDraftRef.current = true
    setStudioSaveStatus('saving')
    try {
      const sourceGenerationHash = await sha256Hex(JSON.stringify({
        sourceCreator: 'create/substack',
        substackFormat: 'article',
        title: gen.title,
        subtitle: gen.subtitle ?? '',
        markdown,
      }))
      const res = await fetch('/api/substack-email/outputs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:          gen.title,
          subtitle:       gen.subtitle,
          markdown,
          wordCount:      gen.wordCount,
          sourceCreator:  'create/substack',
          substackFormat: 'article',
          sourceGenerationHash,
          campaignId:     campaignId ?? null,
        }),
      })
      const data = await res.json().catch(() => ({})) as { id?: string; error?: string }
      if (!res.ok || !data.id) throw new Error(data.error ?? `HTTP ${res.status}`)
      setSavedStudioDraftId(data.id)
      setStudioSaveStatus('saved')
    } catch (err) {
      console.warn('[substack] Studio auto-save failed', err)
      setStudioSaveStatus('error')
    } finally {
      savingStudioDraftRef.current = false
    }
  }

  const hasConnections = substackConnections.length > 0

  // ── Setup / Generating state ─────────────────────────────────────────────────

  if (state === 'setup' || state === 'generating') {
    return (
      <div className="mx-auto max-w-2xl px-8 py-10">
        <form onSubmit={handleGenerate} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-zinc-400">
              Source Content
            </label>
            <textarea
              value={sourceContent}
              onChange={e => setSourceContent(e.target.value)}
              placeholder="Paste a URL, article text, research notes, or any source you want to adapt into a Substack article…"
              rows={8}
              required
              disabled={state === 'generating'}
              className="w-full resize-none rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-relaxed placeholder-zinc-400 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Type</label>
              <div className="relative">
                <select
                  value={articleType}
                  onChange={e => setArticleType(e.target.value as SubstackGenerationRequest['articleType'])}
                  disabled={state === 'generating'}
                  className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
                >
                  {Object.entries(SUBSTACK_ARTICLE_TYPES).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Length</label>
              <div className="relative">
                <select
                  value={length}
                  onChange={e => setLength(e.target.value as SubstackGenerationRequest['length'])}
                  disabled={state === 'generating'}
                  className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
                >
                  {Object.entries(SUBSTACK_LENGTH_TARGETS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label} — {v.words}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {lenses.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Editorial Lens</label>
              <div className="relative">
                <select
                  value={selectedLens ?? ''}
                  onChange={e => setSelectedLens(e.target.value || null)}
                  disabled={state === 'generating'}
                  className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-8 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none disabled:opacity-50"
                >
                  <option value="">No lens</option>
                  {lenses.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          )}

          {/* Campaign — optional attribution */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400">Campaign</label>
            <CampaignSelect
              value={campaignId ?? null}
              onChange={id => setCampaignId(id)}
              disabled={state === 'generating'}
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={state === 'generating' || !sourceContent.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {state === 'generating' ? (
              <>
                <Spinner size="md" />
                {progressLabel || 'Generating…'}
              </>
            ) : 'Generate Article'}
          </button>
        </form>
      </div>
    )
  }

  // ── Result state ─────────────────────────────────────────────────────────────

  if (!generated) return null

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Article preview */}
      <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto max-w-2xl mb-8">
          <SocialPreviewInline data={previewData} label="Preview" />
        </div>
        <article className="mx-auto max-w-2xl space-y-6">
          <div className="space-y-1.5">
            <h1 className="font-[Signifier,_Georgia,_serif] text-2xl font-semibold leading-snug text-zinc-900">
              {generated.title}
            </h1>
            {generated.subtitle && (
              <p className="text-base text-zinc-500">{generated.subtitle}</p>
            )}
            <p className="text-xs text-zinc-400">{generated.wordCount.toLocaleString()} words</p>
          </div>

          <div
            className="prose prose-zinc prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: articleBodyToPreviewHtml(generated) }}
          />
        </article>
      </div>

      {/* Right sidebar — save draft CTA */}
      <div className="w-72 shrink-0 border-l border-zinc-100 bg-zinc-50 p-6 flex flex-col gap-6">
        {/* Studio auto-save status (non-blocking) */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">Studio</p>
          {studioSaveStatus === 'saving' && (
            <p className="flex items-center gap-2 text-xs text-zinc-500"><Spinner size="sm" /> Saving to Studio…</p>
          )}
          {studioSaveStatus === 'saved' && savedStudioDraftId && (
            <p className="text-xs text-emerald-600">
              Saved to Studio ·{' '}
              <a href={`/${workspaceSlug ?? ''}/studio/${savedStudioDraftId}`} className="underline hover:text-emerald-700">Open</a>
            </p>
          )}
          {studioSaveStatus === 'error' && (
            <p className="text-xs text-amber-600">
              Couldn’t save to Studio automatically. You can still copy or save to Substack below.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">Save to Substack</p>

          {!hasConnections ? (
            <div className="rounded-lg border border-zinc-200 bg-white p-4 text-center">
              <p className="text-sm text-zinc-600 mb-3">No Substack account connected.</p>
              <a
                href={`/${workspaceSlug ?? ''}/settings/publishing`}
                className="text-xs text-zinc-500 underline hover:text-zinc-700"
              >
                Connect in Settings →
              </a>
            </div>
          ) : (
            <div className="space-y-3">
              {substackConnections.length > 1 && (
                <div>
                  <label className="mb-1 block text-[11px] text-zinc-400">Publication</label>
                  <div className="relative">
                    <select
                      value={selectedConnection}
                      onChange={e => setSelectedConnection(e.target.value)}
                      className="w-full appearance-none rounded-lg border border-zinc-200 bg-white py-2 pl-3 pr-7 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                    >
                      {substackConnections.map(c => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
                  </div>
                </div>
              )}

              {draftResult ? (
                <div className="space-y-2">
                  <p className="text-xs text-emerald-600 font-medium">Draft saved.</p>
                  {draftResult.providerUrl && (
                    <a
                      href={draftResult.providerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF6719] py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e55a10]"
                    >
                      Open in Substack
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSaveDraft}
                  disabled={savingDraft || !selectedConnection}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
                >
                  {savingDraft ? (
                    <>
                      <Spinner size="sm" />
                      Saving draft…
                    </>
                  ) : 'Save Draft & Open in Substack'}
                </button>
              )}

              {draftError && (
                <p className="text-xs text-red-500">{draftError}</p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-200 pt-4">
          <button
            onClick={() => {
              setState('setup')
              setGenerated(null)
              setDraftResult(null)
              setDraftError(null)
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            ← Generate another
          </button>
        </div>

        <div className="mt-auto rounded-lg border border-zinc-200 bg-white p-3">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            V1 creates drafts only. Open in Substack to set audience, send date, and publish.
          </p>
        </div>
      </div>
    </div>
  )
}

// Stable hex digest of the finalized generation payload — the server-side idempotency
// key for auto-saved Studio drafts (dedupes stream-retry / remount / multi-tab saves).
async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Plain-text rendering of the article body for the network preview card.
function articlePlainText(article: SubstackGeneratedArticle): string {
  return article.article.body
    .map(node => {
      switch (node.type) {
        case 'heading':    return node.text
        case 'paragraph':  return node.html.replace(/<[^>]+>/g, '')
        case 'blockquote': return node.html.replace(/<[^>]+>/g, '')
        case 'list':       return node.items.map(i => `• ${i.replace(/<[^>]+>/g, '')}`).join('\n')
        case 'code':       return node.code
        default:           return ''
      }
    })
    .filter(Boolean)
    .join('\n\n')
}

// Convert CanonicalArticle body to preview HTML (re-uses the canonical serializer)
function articleBodyToPreviewHtml(article: SubstackGeneratedArticle): string {
  return article.article.body
    .map(node => {
      switch (node.type) {
        case 'heading':    return `<h${node.level}>${node.text}</h${node.level}>`
        case 'paragraph':  return `<p>${node.html}</p>`
        case 'blockquote': return node.attribution
          ? `<blockquote><p>${node.html}</p><cite>${node.attribution}</cite></blockquote>`
          : `<blockquote><p>${node.html}</p></blockquote>`
        case 'code':       return `<pre><code>${node.code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`
        case 'list':       return node.ordered
          ? `<ol>${node.items.map(i => `<li>${i}</li>`).join('')}</ol>`
          : `<ul>${node.items.map(i => `<li>${i}</li>`).join('')}</ul>`
        case 'image':      return `<figure><img src="${node.url}" alt="${node.alt ?? ''}">${node.caption ? `<figcaption>${node.caption}</figcaption>` : ''}</figure>`
        case 'divider':    return '<hr>'
        case 'embed':      return `<p><a href="${node.url}" rel="noopener noreferrer">${node.url}</a></p>`
        default:           return ''
      }
    })
    .filter(Boolean)
    .join('\n')
}
