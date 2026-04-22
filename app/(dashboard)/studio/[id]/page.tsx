'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VariantsRail } from '@/components/studio/variants-rail'
import { AiActionsPanel } from '@/components/studio/ai-actions-panel'
import { InlineSuggestion } from '@/components/studio/inline-suggestion'
import { useAutosave } from '@/hooks/use-autosave'
import { useAiActions, type SuggestionBlock } from '@/hooks/use-ai-actions'
import type { Output, OutputContent, OutputStatus } from '@/types/domain'
import type { AiActionId } from '@/app/api/ai-actions/route'

interface Channel { id: string; platform: string; label: string | null }
interface Variant  { id: string; label: string; isCurrent: boolean }

const STATUS_DOT: Record<OutputStatus, string> = {
  draft:     'bg-zinc-600',
  review:    'bg-amber-500',
  approved:  'bg-emerald-500',
  published: 'bg-blue-500',
  archived:  'bg-zinc-700',
}

function deriveLabel(angle: string | undefined | null, idx: number): string {
  if (angle) return angle
  return String.fromCharCode(65 + idx)
}

export default function StudioEditorPage() {
  const { id } = useParams<{ id: string }>()

  const [output,   setOutput]   = useState<Output | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading,  setLoading]  = useState(true)

  const [title,        setTitle]        = useState('')
  const [body,         setBody]         = useState('')
  const [hashtags,     setHashtags]     = useState<string[]>([])
  const [hashtagInput, setHashtagInput] = useState('')
  const [channelId,    setChannelId]    = useState<string | null>(null)

  const [aiPanelOpen,   setAiPanelOpen]   = useState(false)
  const [showCopyMenu,  setShowCopyMenu]  = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [sendingReview, setSendingReview] = useState(false)
  const [publishing,    setPublishing]    = useState(false)
  const [postingToLinkedIn, setPostingToLinkedIn] = useState(false)
  const [linkedInPosted,    setLinkedInPosted]    = useState(false)
  const [linkedInPostUrn,   setLinkedInPostUrn]   = useState<string | null>(null)
  const [publishError,      setPublishError]      = useState<string | null>(null)

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
      if (!oRes.ok) { setLoading(false); return }
      const data: Output = await oRes.json()
      setOutput(data)
      if (data.providerPostId) {
        setLinkedInPosted(true)
        setLinkedInPostUrn(data.providerPostId)
      }
      const content = data.content as OutputContent
      setBody(content.body ?? '')
      setTitle(data.title ?? '')
      setChannelId(data.channelId ?? null)
      setHashtags(((content.hashtags as string[] | undefined) ?? []).map(h => h.replace(/^#/, '')))
      if (cRes.ok) setChannels(await cRes.json())

      if (data.generationId) {
        const vRes = await fetch(`/api/outputs?generation_id=${data.generationId}`)
        if (vRes.ok) {
          const siblings: Output[] = await vRes.json()
          setVariants(siblings.map((s, i) => ({
            id: s.id,
            label: deriveLabel((s.content as OutputContent & { angle?: string }).angle, i),
            isCurrent: s.id === id,
          })))
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
    const content: OutputContent = { ...(output.content as OutputContent), body, hashtags }
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, title, channel_id: channelId }),
    })
    if (res.ok) setOutput(await res.json())
    setSaving(false)
  }

  async function handleSendForReview() {
    setSendingReview(true)
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' }),
    })
    if (res.ok) setOutput(await res.json())
    setSendingReview(false)
  }

  async function handlePublish() {
    setPublishing(true)
    const res = await fetch(`/api/outputs/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    })
    if (res.ok) setOutput(await res.json())
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

  function handleCopy(format: 'plain' | 'markdown' | 'linkedin') {
    const tags = hashtags.map(h => `#${h}`).join(' ')
    let text = ''
    if (format === 'markdown') {
      text = [title ? `# ${title}` : '', '', body, tags ? `\n${tags}` : ''].filter(Boolean).join('\n').trim()
    } else if (format === 'linkedin') {
      text = [title, '', body, tags ? `\n${tags}` : ''].filter(Boolean).join('\n').trim()
    } else {
      text = [title, body].filter(Boolean).join('\n\n')
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

  const assignedChannel = channelId ? channels.find(ch => ch.id === channelId) : null
  const isLinkedInAssigned = assignedChannel?.platform === 'linkedin'

  if (loading) {
    return (
      <div className="-m-6 flex items-center justify-center bg-zinc-950" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <div className="space-y-3 w-56">
          <div className="h-4 rounded bg-zinc-800 animate-pulse" />
          <div className="h-3 rounded bg-zinc-800 animate-pulse w-3/4" />
          <div className="h-3 rounded bg-zinc-800 animate-pulse w-1/2" />
        </div>
      </div>
    )
  }

  if (!output) {
    return (
      <div className="-m-6 flex items-center justify-center bg-zinc-950" style={{ minHeight: 'calc(100vh - 56px)' }}>
        <p className="text-sm text-zinc-600">Draft not found.</p>
      </div>
    )
  }

  const wordCount = body.trim() ? body.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = body.length

  return (
    <div className="-m-6 flex flex-col bg-zinc-950" style={{ minHeight: 'calc(100vh - 56px)' }}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-b border-zinc-800/60">
        <div className="flex items-center gap-3">
          <Link href="/studio" className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[output.status])} />
            <span className="text-xs text-zinc-500 capitalize">{output.status}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
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
              {ch.label ?? ch.platform}
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
            AI Actions
          </button>
        </div>
      </div>

      {/* ── Editor area ── */}
      <div className="flex flex-1 overflow-hidden relative">
        <VariantsRail variants={variants} />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-8 py-10 md:px-12 space-y-6">

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

      {/* ── Bottom bar ── */}
      <div className="flex items-center justify-between px-4 h-12 flex-shrink-0 border-t border-zinc-800/60">
        <div className="flex items-center gap-3 text-xs text-zinc-700">
          <span>{wordCount}w</span>
          <span className={cn(charCount > 2800 ? 'text-amber-600' : '')}>{charCount}c</span>
          {charCount > 2800 && charCount <= 3000 && (
            <span className="text-amber-500">{3000 - charCount} left</span>
          )}
          {charCount > 3000 && (
            <span className="text-red-500">+{charCount - 3000} over</span>
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
                {(['plain', 'markdown', 'linkedin'] as const).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => handleCopy(fmt)}
                    className="block w-full px-4 py-2.5 text-left text-xs text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 first:rounded-t-md last:rounded-b-md transition-colors"
                  >
                    {fmt === 'plain' ? 'Plain text' : fmt === 'markdown' ? 'Markdown' : 'LinkedIn ready'}
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
          {output.status === 'approved' && !linkedInPosted && (
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
              <a
                href="https://www.linkedin.com/feed/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
              >
                View on LinkedIn ↗
              </a>
              <Link
                href="/channels"
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
