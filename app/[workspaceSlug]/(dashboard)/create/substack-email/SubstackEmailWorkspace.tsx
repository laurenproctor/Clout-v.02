'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, ChevronDown } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { SocialPreviewInline, previewFromStudioState } from '@/components/social-preview'
import type { SubstackGenerationRequest, SubstackGeneratedArticle, SubstackGenerationEvent } from '@/lib/substack/types'
import type { ProviderConnectionSafe } from '@/lib/publishing/types'
import type { CanonicalArticle } from '@/lib/publishing/canonical/types'
import { SUBSTACK_LENGTH_TARGETS, SUBSTACK_ARTICLE_TYPES } from '@/lib/syndication/platforms/substack'

interface Lens { id: string; name: string }

interface SubstackEmailWorkspaceProps {
  lenses:               Lens[]
  substackConnections:  ProviderConnectionSafe[]
  workspaceSlug:        string
}

type WorkspaceState = 'setup' | 'generating' | 'result'

interface DraftResult {
  providerContentId: string
  providerUrl:       string
}

export function SubstackEmailWorkspace({ lenses, substackConnections, workspaceSlug }: SubstackEmailWorkspaceProps) {
  const router = useRouter()

  const [state,         setState]         = useState<WorkspaceState>('setup')
  const [sourceContent, setSourceContent] = useState('')
  const [length,        setLength]        = useState<SubstackGenerationRequest['length']>('standard')
  const [articleType,   setArticleType]   = useState<SubstackGenerationRequest['articleType']>('essay')
  const [selectedLens,  setSelectedLens]  = useState<string | null>(lenses[0]?.id ?? null)
  const [progressLabel, setProgressLabel] = useState('')
  const [generated,     setGenerated]     = useState<SubstackGeneratedArticle | null>(null)
  const [error,         setError]         = useState<string | null>(null)

  // Primary action — Save to Studio
  const [savingToStudio, setSavingToStudio] = useState(false)

  // Secondary action — Save draft to Substack (gated)
  const [publishingEnabled,  setPublishingEnabled]  = useState(false)
  const [selectedConnection, setSelectedConnection] = useState<string>(substackConnections[0]?.id ?? '')
  const [savingDraft,        setSavingDraft]        = useState(false)
  const [draftResult,        setDraftResult]        = useState<DraftResult | null>(null)
  const [draftError,         setDraftError]         = useState<string | null>(null)

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

  // Resolve whether Substack publishing is enabled (server-side gate). The direct
  // "Save draft to Substack" action only renders when publishing is enabled AND a
  // connection exists — Save to Studio never depends on this.
  useEffect(() => {
    let cancelled = false
    void fetch('/api/publishing/substack/capabilities')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled && d) setPublishingEnabled(Boolean(d.publishingEnabled)) })
      .catch(() => { /* leave disabled — fail closed to Save-to-Studio only */ })
    return () => { cancelled = true }
  }, [])

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!sourceContent.trim()) return

    setError(null)
    setGenerated(null)
    setDraftResult(null)
    setDraftError(null)
    setState('generating')
    setProgressLabel('Preparing…')

    abortRef.current = new AbortController()

    const request: SubstackGenerationRequest = {
      sourceType:    'text',
      sourceContent: sourceContent.trim(),
      lensIds:       selectedLens ? [selectedLens] : [],
      articleType,
      length,
    }

    try {
      const res = await fetch('/api/substack/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ request }),
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
            if (event.type === 'complete') { setGenerated(event.data); setState('result') }
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

  // PRIMARY: create a lifecycle-ready substack-newsletter output and open it in Studio.
  async function handleSaveToStudio() {
    if (!generated) return
    setSavingToStudio(true)
    setError(null)
    try {
      const res = await fetch('/api/substack-email/outputs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:     generated.title,
          subtitle:  generated.subtitle,
          markdown:  generated.markdown,   // markdown is the editable body, not canonical JSON
          wordCount: generated.wordCount,
        }),
      })
      const data = await res.json().catch(() => ({})) as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        setError(data.error ?? 'Could not save to Studio. Please try again.')
        return
      }
      router.push(`/${workspaceSlug}/studio/${data.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSavingToStudio(false)
    }
  }

  // SECONDARY: push a draft straight to Substack (convenience). Reuses the existing
  // /api/publishing/publish draft flow — never a separate publishing path.
  async function handleSaveDraftToSubstack() {
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
          opts: { status: 'draft', overrideExcerpt: generated.subtitle },
          sourceType: 'manual',
        }),
      })
      const data = await res.json().catch(() => ({})) as { providerContentId?: string; providerUrl?: string; error?: string }
      if (!res.ok) {
        setDraftError(data.error ?? 'Failed to save draft to Substack.')
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

  const hasConnections   = substackConnections.length > 0
  const showDirectDraft  = publishingEnabled && hasConnections

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
              placeholder="Paste a URL, article text, research notes, or any source you want to adapt into a Substack email…"
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
            ) : 'Generate Substack Email'}
          </button>
        </form>
      </div>
    )
  }

  // ── Result state ─────────────────────────────────────────────────────────────

  if (!generated) return null

  return (
    <div className="flex h-full min-h-0 gap-0">
      {/* Email preview */}
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

      {/* Right sidebar — save actions */}
      <div className="w-72 shrink-0 border-l border-zinc-100 bg-zinc-50 p-6 flex flex-col gap-6">
        {/* PRIMARY: Save to Studio */}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">Save to Studio</p>
          <button
            onClick={handleSaveToStudio}
            disabled={savingToStudio}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
          >
            {savingToStudio ? (<><Spinner size="sm" />Saving…</>) : 'Save to Studio →'}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
            {showDirectDraft
              ? 'Refine, schedule, and publish from Studio.'
              : 'You can save this Substack Email to Studio now. Connect Substack later to save drafts or publish.'}
          </p>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>

        {/* SECONDARY: Save draft to Substack (only when publishing enabled + connected) */}
        {showDirectDraft && (
          <div className="border-t border-zinc-200 pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-3">Or save draft to Substack</p>
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
                  <p className="text-xs text-emerald-600 font-medium">Draft saved to Substack.</p>
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
                  onClick={handleSaveDraftToSubstack}
                  disabled={savingDraft || !selectedConnection}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                >
                  {savingDraft ? (<><Spinner size="sm" />Saving draft…</>) : 'Save draft to Substack'}
                </button>
              )}

              {draftError && <p className="text-xs text-red-500">{draftError}</p>}
            </div>
          </div>
        )}

        <div className="border-t border-zinc-200 pt-4">
          <button
            onClick={() => {
              setState('setup')
              setGenerated(null)
              setDraftResult(null)
              setDraftError(null)
              setError(null)
            }}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            ← Generate another
          </button>
        </div>
      </div>
    </div>
  )
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

// Convert CanonicalArticle body to preview HTML (matches the article creator's serializer).
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
