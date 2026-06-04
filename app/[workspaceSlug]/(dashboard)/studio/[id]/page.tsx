'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Sparkles, ChevronDown } from 'lucide-react'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { cn } from '@/lib/utils'
import { VariantsRail } from '@/components/studio/variants-rail'
import { AiActionsPanel } from '@/components/studio/ai-actions-panel'
import { InlineSuggestion } from '@/components/studio/inline-suggestion'
import { PlatformTabs } from '@/components/studio/PlatformTabs'
import { PlatformPreview } from '@/components/studio/PlatformPreview'
import { VisualsTab } from '@/components/studio/visuals-tab'
import { useAutosave } from '@/hooks/use-autosave'
import { useAiActions, type SuggestionBlock } from '@/hooks/use-ai-actions'
import type { Output, OutputContent, OutputStatus, ChannelPlatform } from '@/types/domain'
import type { AiActionId } from '@/app/api/ai-actions/route'
import { findProviderCapabilities } from '@/lib/providers/registry'
import { IdentityBar } from '@/components/publishing/identity-bar'

interface FullChannel {
  id: string
  platform: ChannelPlatform
  label: string | null
  account_id: string | null
  [key: string]: unknown
}

interface Variant { id: string; label: string; isCurrent: boolean }

interface PlatformTab {
  postId: string
  platform: ChannelPlatform
  accountName: string
  status: string
}

const STATUS_DOT: Record<OutputStatus, string> = {
  draft:      'bg-zinc-600',
  review:     'bg-amber-500',
  approved:   'bg-emerald-500',
  queued:     'bg-violet-500',
  publishing: 'bg-blue-400',
  published:  'bg-blue-500',
  failed:     'bg-red-400',
  archived:   'bg-zinc-700',
}

function deriveLabel(angle: string | undefined | null, idx: number): string {
  if (angle) return angle
  return String.fromCharCode(65 + idx)
}

function channelDisplayName(ch: FullChannel): string {
  return ch.label ?? ch.account_id ?? ch.platform
}

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { slug } = useWorkspace()

  const [output,   setOutput]   = useState<Output | null>(null)
  const [channels, setChannels] = useState<FullChannel[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [siblings, setSiblings] = useState<Output[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [title,        setTitle]        = useState('')
  const [body,         setBody]         = useState('')
  const [hashtags,     setHashtags]     = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [channelId,    setChannelId]    = useState<string | null>(null)

  const [rightTab, setRightTab] = useState<'preview' | 'visuals'>('preview')

  const [aiPanelOpen,   setAiPanelOpen]   = useState(false)
  const [showCopyMenu,  setShowCopyMenu]  = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [sendingReview, setSendingReview] = useState(false)
  const [publishing,    setPublishing]    = useState(false)
  const [postingToLinkedIn, setPostingToLinkedIn] = useState(false)
  const [linkedInPosted,    setLinkedInPosted]    = useState(false)
  const [linkedInPostUrn,   setLinkedInPostUrn]   = useState<string | null>(null)
  const [postingToX,        setPostingToX]        = useState(false)
  const [xPosted,           setXPosted]           = useState(false)
  const [xPostUrl,          setXPostUrl]          = useState<string | null>(null)
  const [publishError,      setPublishError]      = useState<string | null>(null)
  const [renderedPreviewBody, setRenderedPreviewBody] = useState<string | null>(null)
  const [previewHasUTMs,      setPreviewHasUTMs]      = useState(false)

  // Platform tabs state — tracks the "active tab" for concept siblings
  const [activeTabId, setActiveTabId] = useState<string>(id)

  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const isEditable = output !== null &&
    output.status !== 'approved' &&
    output.status !== 'published'

  const { autoSaving, lastSaved } = useAutosave({
    outputId: id,
    enabled: isEditable,
    title,
    body,
    hashtags,
    existingContent: (output?.content ?? {}) as OutputContent,
  })

  const { running, suggestions, majorResult, runAction, dismissSuggestion } = useAiActions(id)

  useEffect(() => {
    async function load() {
      const [oRes, cRes] = await Promise.all([
        fetch(`/api/outputs/${id}`),
        fetch('/api/channels'),
      ])
      if (!oRes.ok) {
        setLoadError(oRes.status === 404 ? 'This draft could not be found.' : 'Failed to load draft. Please try again.')
        setLoading(false)
        return
      }

      const channelList: FullChannel[] = cRes.ok ? await cRes.json() : []
      setChannels(channelList)

      const data: Output = await oRes.json()
      setOutput(data)

      const content = data.content as OutputContent
      setBody(content.body ?? '')
      setTitle(data.title ?? '')
      setChannelId(data.channelId ?? null)
      setHashtags(((content.hashtags as string[] | undefined) ?? []).map(h => h.replace(/^#/, '')))
      setActiveTabId(id)

      if (data.providerPostId) {
        const assignedCh = channelList.find(c => c.id === data.channelId)
        if (assignedCh?.platform === 'x') {
          setXPosted(true)
          setXPostUrl(data.providerPostUrl ?? null)
        } else {
          setLinkedInPosted(true)
          setLinkedInPostUrn(data.providerPostId)
        }
      }

      // Load variants (generation group siblings)
      const groupQuery = data.generationGroupId
        ? `generation_group_id=${data.generationGroupId}`
        : data.generationId
        ? `generation_id=${data.generationId}`
        : null
      if (groupQuery) {
        const vRes = await fetch(`/api/outputs?${groupQuery}`)
        if (vRes.ok) {
          const variantList: Output[] = await vRes.json()
          setVariants(variantList.map((s, i) => ({
            id: s.id,
            label: deriveLabel((s.content as OutputContent & { angle?: string }).angle, i),
            isCurrent: s.id === id,
          })))
        }
      }

      // Load concept siblings for platform tabs
      if (data.conceptId) {
        const sRes = await fetch(`/api/outputs?conceptId=${data.conceptId}`)
        if (sRes.ok) {
          const siblingList: Output[] = await sRes.json()
          setSiblings(siblingList)
        }
      }

      setLoading(false)
    }
    load()
  }, [id])

  // Auto-grow textarea
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [body])

  // Fetch rendered body (with UTMs) for the preview panel.
  // Only runs when body contains a URL and a platform is known.
  useEffect(() => {
    const platform = assignedChannel?.platform ?? 'linkedin'
    if (!body.includes('http')) {
      setRenderedPreviewBody(null)
      setPreviewHasUTMs(false)
      return
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/outputs/${id}/rendered?platform=${platform}`)
        if (!res.ok) return
        const data = await res.json()
        setRenderedPreviewBody(data.body ?? null)
        setPreviewHasUTMs(data.attribution?.applied ?? false)
      } catch {
        // silently fall back to canonical body
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [id, body, channelId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts — no dep array so handlers always capture fresh state
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key === 'j') { e.preventDefault(); setAiPanelOpen(v => !v) }
      if (mod && e.key === 's') { e.preventDefault(); void handleSave() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  async function handleSave() {
    if (!output) return
    setSaving(true)
    setPublishError(null)
    const content: OutputContent = { ...(output.content as OutputContent), body, hashtags }
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, channel_id: channelId }),
    })
    if (res.ok) {
      setOutput(await res.json())
    } else {
      const d = await res.json().catch(() => ({}))
      setPublishError(d.error ?? 'Save failed. Please try again.')
    }
    setSaving(false)
  }

  async function handleSendForReview() {
    setSendingReview(true)
    setPublishError(null)
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' }),
    })
    if (res.ok) {
      setOutput(await res.json())
    } else {
      const d = await res.json().catch(() => ({}))
      setPublishError(d.error ?? 'Could not send for review. Please try again.')
    }
    setSendingReview(false)
  }

  async function handlePublish() {
    setPublishing(true)
    setPublishError(null)
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })
    if (res.ok) {
      setOutput(await res.json())
    } else {
      const d = await res.json().catch(() => ({}))
      setPublishError(d.error ?? 'Could not publish. Please try again.')
    }
    setPublishing(false)
  }

  async function handlePostToLinkedIn() {
    setPostingToLinkedIn(true)
    setPublishError(null)
    const res = await fetch('/api/channels/linkedin/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId: id }),
    })
    const data = await res.json()
    if (res.ok) {
      setLinkedInPosted(true)
      setLinkedInPostUrn(data.postUrn ?? null)
      const refreshed = await fetch(`/api/outputs/${id}`)
      if (refreshed.ok) setOutput(await refreshed.json())
    } else {
      setPublishError(data.error ?? 'Something went wrong. Please try again.')
    }
    setPostingToLinkedIn(false)
  }

  async function handlePostToX() {
    setPostingToX(true)
    setPublishError(null)
    const res = await fetch('/api/channels/x/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outputId: id }),
    })
    const data = await res.json()
    if (res.ok) {
      setXPosted(true)
      setXPostUrl(data.postUrl ?? null)
      const refreshed = await fetch(`/api/outputs/${id}`)
      if (refreshed.ok) setOutput(await refreshed.json())
    } else {
      setPublishError(data.error ?? 'Something went wrong. Please try again.')
    }
    setPostingToX(false)
  }

  async function handleCopy(format: 'plain' | 'markdown' | 'linkedin' | 'x') {
    const tags = hashtags.map(h => `#${h}`).join(' ')
    let bodyForCopy = body

    // For platform-specific formats, fetch the rendered body with UTMs applied.
    if ((format === 'linkedin' || format === 'x') && body.includes('http')) {
      try {
        const platform = format === 'linkedin' ? 'linkedin' : 'x'
        const res = await fetch(`/api/outputs/${id}/rendered?platform=${platform}`)
        if (res.ok) {
          const data = await res.json()
          if (data.attribution?.applied) bodyForCopy = data.body
        }
      } catch {
        // silently fall back to canonical body
      }
    }

    let text = ''
    if (format === 'markdown') {
      text = [title ? `# ${title}` : '', '', bodyForCopy, tags ? `\n${tags}` : ''].filter(Boolean).join('\n').trim()
    } else if (format === 'linkedin') {
      text = [title, '', bodyForCopy, tags ? `\n${tags}` : ''].filter(Boolean).join('\n').trim()
    } else if (format === 'x') {
      const full = [title, bodyForCopy, tags].filter(Boolean).join(' ').trim()
      text = full.length <= 280 ? full : full.slice(0, 277) + '…'
    } else {
      text = [title, bodyForCopy].filter(Boolean).join('\n\n')
    }
    navigator.clipboard.writeText(text)
    setCopied(true)
    setShowCopyMenu(false)
    setTimeout(() => setCopied(false), 2000)
  }

  function applySuggestion(block: SuggestionBlock) {
    if (block.field === 'title') setTitle(block.suggestion)
    else setBody(block.suggestion)
    dismissSuggestion(block.id)
  }

  function handleHashtagKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (['Enter', ' ', ','].includes(e.key)) {
      e.preventDefault()
      const tag = hashtagInput.trim().replace(/^#/, '')
      if (tag && !hashtags.includes(tag)) setHashtags(p => [...p, tag])
      setHashtagInput('')
    }
    if (e.key === 'Backspace' && hashtagInput === '' && hashtags.length > 0) {
      setHashtags(p => p.slice(0, -1))
    }
  }

  function handleHashtagBlur() {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !hashtags.includes(tag)) setHashtags(p => [...p, tag])
    setHashtagInput('')
  }

  function formatSaved(d: Date) {
    const s = Math.floor((Date.now() - d.getTime()) / 1000)
    if (s < 60) return 'Saved'
    return `Saved ${Math.floor(s / 60)}m ago`
  }

  function formatScheduledDate(iso: string): string {
    const d = new Date(iso)
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' })
    const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return `${weekday}, ${date} · ${time}`
  }

  function scheduledWeekStart(iso: string): string {
    const d = new Date(iso)
    const day = d.getUTCDay()
    const diff = day === 0 ? -6 : 1 - day
    d.setUTCDate(d.getUTCDate() + diff)
    return d.toISOString().split('T')[0]
  }

  const assignedChannel    = channelId ? channels.find(ch => ch.id === channelId) : null
  const isLinkedInAssigned = assignedChannel?.platform === 'linkedin'
  const isXAssigned        = assignedChannel?.platform === 'x'

  const caps      = assignedChannel ? findProviderCapabilities(assignedChannel.platform) : null
  const charLimit = caps?.charLimit ?? 3000
  const warnAt    = Math.floor(charLimit * 0.93)

  // Build platform tabs from concept siblings
  const platformTabs: PlatformTab[] = siblings
    .filter(s => s.channelId)
    .reduce<PlatformTab[]>((acc, s) => {
      const ch = channels.find(c => c.id === s.channelId)
      if (!ch) return acc
      acc.push({
        postId: s.id,
        platform: ch.platform,
        accountName: channelDisplayName(ch),
        status: s.status,
      })
      return acc
    }, [])

  // Determine which sibling post to preview.
  // For the current post, swap in the rendered body (UTM-tagged) when available.
  const previewOutput = activeTabId === id
    ? { body: (previewHasUTMs && renderedPreviewBody) ? renderedPreviewBody : body, title }
    : (() => {
        const sib = siblings.find(s => s.id === activeTabId)
        if (!sib) return { body, title }
        const c = sib.content as OutputContent
        return { body: c.body ?? '', title: sib.title ?? '' }
      })()

  // Channel for the active preview tab
  const activePreviewOutput = siblings.find(s => s.id === activeTabId)
  const activePreviewChannel = activePreviewOutput?.channelId
    ? channels.find(c => c.id === activePreviewOutput.channelId)
    : assignedChannel

  const previewPlatform: ChannelPlatform = activePreviewChannel?.platform ?? assignedChannel?.platform ?? 'linkedin'
  const previewAccountName = activePreviewChannel ? channelDisplayName(activePreviewChannel) : (assignedChannel ? channelDisplayName(assignedChannel) : '')
  const previewHandle = previewAccountName.toLowerCase().replace(/\s+/g, '')
  const visualsPlatform: string = assignedChannel?.platform ?? previewPlatform ?? 'linkedin'

  if (loading) {
    return (
      <div className="-m-6 flex items-center justify-center bg-zinc-950" style={{ minHeight: 'calc(100dvh - 56px)' }}>
        <div className="space-y-3 w-56">
          <div className="h-4 rounded bg-zinc-800 animate-pulse" />
          <div className="h-3 rounded bg-zinc-800 animate-pulse w-3/4" />
          <div className="h-3 rounded bg-zinc-800 animate-pulse w-1/2" />
        </div>
      </div>
    )
  }

  if (loadError || !output) {
    return (
      <div className="-m-6 flex flex-col items-center justify-center gap-4 bg-zinc-950" style={{ minHeight: 'calc(100dvh - 56px)' }}>
        <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center">
          <FileText className="h-5 w-5 text-zinc-600" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-zinc-300">{loadError ?? 'Draft not found.'}</p>
          <p className="text-xs text-zinc-600">The draft may have been deleted or you may not have access.</p>
        </div>
        <Link href={`/${slug}/calendar`} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to calendar
        </Link>
      </div>
    )
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = body.length

  const showPlatformTabs = platformTabs.length > 1
  const showPreviewPanel = previewAccountName !== '' || assignedChannel !== null

  return (
    <div className="-m-6 flex flex-col bg-zinc-950" style={{ minHeight: 'calc(100dvh - 56px)' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <Link href={`/${slug}/calendar`} className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 transition-colors text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            Calendar
          </Link>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[output.status])} />
            <span className="text-xs text-zinc-500 capitalize">{output.status}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => setChannelId(null)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              channelId === null ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'
            )}
          >
            No channel
          </button>
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setChannelId(ch.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors',
                channelId === ch.id ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-600 hover:text-zinc-400'
              )}
            >
              {channelDisplayName(ch)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-700 tabular-nums">
            {autoSaving ? 'Saving…' : lastSaved ? formatSaved(lastSaved) : ''}
          </span>
          <button
            onClick={() => setAiPanelOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors border',
              aiPanelOpen
                ? 'bg-zinc-700 border-zinc-600 text-zinc-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            )}
          >
            <Sparkles className="h-3.5 w-3.5" />
            Actions
          </button>
        </div>
      </div>

      {/* ── Identity bar ── */}
      <div className="px-4 py-2 border-b border-zinc-800/60 flex-shrink-0">
        <IdentityBar outputId={id} />
      </div>

      {/* ── Main content: editor + preview ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: editor area ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">

          {/* Platform tabs (concept siblings) */}
          {showPlatformTabs && (
            <PlatformTabs
              tabs={platformTabs}
              activePostId={activeTabId}
              onSelectTab={(postId) => {
                if (postId === id) {
                  setActiveTabId(id)
                } else {
                  setActiveTabId(postId)
                  router.push(`/${slug}/studio/${postId}`)
                }
              }}
            />
          )}

          <div className="flex flex-1 overflow-hidden relative">
            <VariantsRail variants={variants} />

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-10 md:px-8 lg:px-12 space-y-6">

                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  disabled={!isEditable}
                  placeholder="Opening line…"
                  className={cn(
                    'w-full bg-transparent text-xl font-semibold text-zinc-100 placeholder:text-zinc-700',
                    'border-none outline-none leading-snug disabled:cursor-default'
                  )}
                />

                {suggestions.filter(s => s.field === 'title').map(s => (
                  <InlineSuggestion key={s.id} block={s} onApply={applySuggestion} onDismiss={dismissSuggestion} />
                ))}

                <textarea
                  ref={bodyRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  disabled={!isEditable}
                  placeholder="Write your post…"
                  rows={12}
                  className={cn(
                    'w-full bg-transparent text-base text-zinc-300 placeholder:text-zinc-700',
                    'border-none outline-none resize-none leading-relaxed disabled:cursor-default'
                  )}
                />

                {suggestions.filter(s => s.field === 'body').map(s => (
                  <InlineSuggestion key={s.id} block={s} onApply={applySuggestion} onDismiss={dismissSuggestion} />
                ))}

                <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/40 pt-4">
                  {hashtags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-0.5 text-xs text-zinc-500">
                      #{tag}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => setHashtags(p => p.filter(t => t !== tag))}
                          className="ml-0.5 text-zinc-700 hover:text-zinc-400 transition-colors"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditable && (
                    <input
                      className="flex-1 min-w-[100px] bg-transparent text-xs text-zinc-500 placeholder:text-zinc-700 outline-none"
                      placeholder="Add tag…"
                      value={hashtagInput}
                      onChange={e => setHashtagInput(e.target.value.replace(/^#/, ''))}
                      onKeyDown={handleHashtagKey}
                      onBlur={handleHashtagBlur}
                    />
                  )}
                </div>

              </div>
            </div>

            <AiActionsPanel
              open={aiPanelOpen}
              onClose={() => setAiPanelOpen(false)}
              running={running}
              majorResult={majorResult}
              onAction={(action: AiActionId) => void runAction(action, title, body)}
            />
          </div>
        </div>

        {/* ── Right: preview + visuals tabs ── */}
        {showPreviewPanel && (
          <div
            className="hidden lg:flex flex-col flex-shrink-0 border-l border-zinc-800/60 overflow-hidden"
            style={{ width: 320 }}
          >
            {/* Tab bar */}
            <div className="flex flex-shrink-0 border-b border-zinc-800/60">
              <button
                onClick={() => setRightTab('preview')}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-medium text-center transition-colors border-b-2 -mb-px',
                  rightTab === 'preview'
                    ? 'text-zinc-200 border-zinc-400'
                    : 'text-zinc-600 border-transparent hover:text-zinc-400',
                )}
              >
                Preview
              </button>
              <button
                onClick={() => setRightTab('visuals')}
                className={cn(
                  'flex-1 py-2.5 text-[11px] font-medium text-center transition-colors border-b-2 -mb-px',
                  rightTab === 'visuals'
                    ? 'text-zinc-200 border-zinc-400'
                    : 'text-zinc-600 border-transparent hover:text-zinc-400',
                )}
              >
                Visuals
              </button>
            </div>

            {/* Preview tab */}
            {rightTab === 'preview' && (
              <div className="flex-1 bg-zinc-50 overflow-y-auto px-6 py-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                    {previewAccountName || assignedChannel?.platform || 'Preview'}
                  </p>
                  {previewHasUTMs && activeTabId === id && (
                    <span className="text-[9px] font-medium text-emerald-600 bg-emerald-500/10 rounded px-1.5 py-0.5 leading-none">
                      UTMs applied
                    </span>
                  )}
                </div>
                <PlatformPreview
                  platform={previewPlatform}
                  accountName={previewAccountName}
                  handle={previewHandle}
                  body={previewOutput.body}
                  subject={previewOutput.title || undefined}
                />
                {platformTabs.length > 1 && (
                  <PlatformTabs
                    tabs={platformTabs}
                    activePostId={activeTabId}
                    onSelectTab={(postId) => {
                      if (postId === id) {
                        setActiveTabId(id)
                      } else {
                        setActiveTabId(postId)
                        router.push(`/${slug}/studio/${postId}`)
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Visuals tab */}
            {rightTab === 'visuals' && (
              <VisualsTab
                outputId={id}
                content={body}
                platform={visualsPlatform}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-t border-zinc-800/60">
        <div className="flex items-center gap-3 text-xs text-zinc-700">
          <span>{wordCount}w</span>
          <span className={cn(charCount > warnAt ? 'text-amber-600' : '')}>{charCount}c</span>
          {charCount > warnAt && charCount <= charLimit && (
            <span className="text-amber-500">{charLimit - charCount} left</span>
          )}
          {charCount > charLimit && (
            <span className="text-red-500">+{charCount - charLimit} over</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex rounded-md border border-zinc-800 overflow-hidden">
              <button
                onClick={() => handleCopy('plain')}
                disabled={!body}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors disabled:opacity-30"
              >
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              <button
                onClick={() => setShowCopyMenu(v => !v)}
                disabled={!body}
                className="px-2 py-1.5 text-zinc-700 hover:text-zinc-400 hover:bg-zinc-900 border-l border-zinc-800 transition-colors disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            {showCopyMenu && (
              <div className="absolute bottom-full right-0 mb-1 w-40 rounded-md border border-zinc-800 bg-zinc-950 shadow-xl z-50">
                {(['plain', 'markdown', 'linkedin', 'x'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleCopy(fmt)}
                    className="block w-full px-4 py-2.5 text-left text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    {fmt === 'plain' ? 'Plain text' : fmt === 'markdown' ? 'Markdown' : fmt === 'linkedin' ? 'LinkedIn ready' : 'X ready'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {output.status === 'draft' && (
            <>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => void handleSendForReview()}
                disabled={sendingReview || !body}
                className="rounded-md bg-zinc-100 hover:bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition-colors disabled:opacity-40"
              >
                {sendingReview ? 'Sending…' : 'Send for review →'}
              </button>
            </>
          )}
          {output.status === 'review' && (
            <span className="rounded-md border border-amber-800/50 bg-amber-950/50 px-3 py-1.5 text-xs text-amber-500">
              In review
            </span>
          )}
          {output.status === 'approved' && !linkedInPosted && !xPosted && (
            <div className="flex items-center gap-2">
              {publishError && (
                <span className="max-w-[220px] text-right text-xs leading-tight text-red-400">
                  {publishError}
                </span>
              )}
              {isLinkedInAssigned ? (
                <button
                  onClick={() => void handlePostToLinkedIn()}
                  disabled={postingToLinkedIn}
                  className="rounded-md bg-zinc-100 hover:bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition-colors disabled:opacity-40"
                >
                  {postingToLinkedIn ? 'Posting…' : 'Post to LinkedIn →'}
                </button>
              ) : isXAssigned ? (
                <button
                  onClick={() => void handlePostToX()}
                  disabled={postingToX}
                  className="rounded-md bg-zinc-100 hover:bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition-colors disabled:opacity-40"
                >
                  {postingToX ? 'Posting…' : 'Post to X →'}
                </button>
              ) : (
                <button
                  onClick={() => void handlePublish()}
                  disabled={publishing}
                  className="rounded-md bg-zinc-100 hover:bg-white px-4 py-1.5 text-xs font-semibold text-zinc-900 transition-colors disabled:opacity-40"
                >
                  {publishing ? 'Publishing…' : 'Publish →'}
                </button>
              )}
            </div>
          )}

          {output.status === 'queued' && (
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-violet-800/50 bg-violet-950/50 px-3 py-1.5 text-xs text-violet-400">
                {output.scheduledAt
                  ? `Queued · ${formatScheduledDate(output.scheduledAt)}`
                  : 'In queue'}
              </span>
              {output.scheduledAt && (
                <Link
                  href={`/${slug}/calendar?week=${scheduledWeekStart(output.scheduledAt)}`}
                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  View in calendar →
                </Link>
              )}
            </div>
          )}

          {output.status === 'published' && !linkedInPosted && (
            <span className="rounded-md border border-blue-800/50 bg-blue-950/50 px-3 py-1.5 text-xs text-blue-400">
              Published ✓
            </span>
          )}

          {linkedInPosted && (
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-emerald-800/50 bg-emerald-950/50 px-3 py-1.5 text-xs text-emerald-400">
                Posted to LinkedIn ✓
              </span>
              {linkedInPostUrn && (
                <a
                  href={`https://www.linkedin.com/feed/update/${encodeURIComponent(linkedInPostUrn)}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  View on LinkedIn ↗
                </a>
              )}
              <Link
                href={`/${slug}/channels`}
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                Back to Publishing
              </Link>
            </div>
          )}
          {xPosted && (
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-emerald-800/50 bg-emerald-950/50 px-3 py-1.5 text-xs text-emerald-400">
                Posted to X ✓
              </span>
              {xPostUrl && (
                <a
                  href={xPostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                >
                  View on X ↗
                </a>
              )}
              <Link
                href={`/${slug}/channels`}
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                Back to Publishing
              </Link>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
