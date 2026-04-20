'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Circle, Loader2, Pencil, Shuffle, BookMarked, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Capture, Output } from '@/types/domain'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawProfile {
  display_name: string | null
  role: string | null
  industry: string | null
  tone_notes: string | null
  channels: string[]
  onboarding_completed_at: string | null
  first_session_dismissed_at: string | null
}

interface Generation {
  positioning: string | null
  post_ideas: Array<{ hook: string; channel: string; text?: string }>
  draft_post: string | null
}

interface Stats {
  capturesThisMonth: number
  outputsGenerated: number
  draftsAwaitingReview: number
}

// ─── Cadence lookup ────────────────────────────────────────────────────────────

const CADENCE: Record<string, string> = {
  LinkedIn: '3× per week',
  'X/Twitter': 'Daily',
  Twitter: 'Daily',
  Newsletter: 'Weekly',
}

function getCadence(channels: string[]): string {
  const entries = channels.map((c) => `${c}: ${CADENCE[c] ?? '2× per week'}`)
  return entries.length > 0 ? entries.join(' · ') : '2× per week'
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()

  const [profile, setProfile] = useState<RawProfile | null>(null)
  const [generation, setGeneration] = useState<Generation | null>(null)
  const [hasCapture, setHasCapture] = useState(false)
  const [hasOutput, setHasOutput] = useState(false)
  const [loading, setLoading] = useState(true)

  // Regular dashboard state
  const [stats, setStats] = useState<Stats>({ capturesThisMonth: 0, outputsGenerated: 0, draftsAwaitingReview: 0 })
  const [recentOutputs, setRecentOutputs] = useState<Output[]>([])
  const [quickCapture, setQuickCapture] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [captureSuccess, setCaptureSuccess] = useState(false)

  // Draft card state
  const [draftEditing, setDraftEditing] = useState(false)
  const [draftText, setDraftText] = useState('')
  const [draftExpanded, setDraftExpanded] = useState(false)
  const [savingToStudio, setSavingToStudio] = useState(false)

  // Dismiss animation
  const [exiting, setExiting] = useState(false)

  const load = useCallback(async () => {
    const [profileRes, genRes, captureRes, outputsRes, allCaptureRes, allOutputsRes, draftRes] = await Promise.all([
      fetch('/api/profile'),
      fetch('/api/onboarding/generation'),
      fetch('/api/capture?limit=1'),
      fetch('/api/outputs?limit=1'),
      fetch('/api/capture?private=false&limit=200'),
      fetch('/api/outputs?limit=5'),
      fetch('/api/outputs?status=draft&limit=200'),
    ])

    let prof: RawProfile | null = null
    if (profileRes.ok) {
      prof = await profileRes.json()
      setProfile(prof)
    }

    if (genRes.ok) {
      const g = await genRes.json()
      setGeneration(g)
      setDraftText(g?.draft_post ?? '')
    }

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    if (captureRes.ok) {
      const caps: Capture[] = await captureRes.json()
      setHasCapture(caps.length > 0)
    }

    if (outputsRes.ok) {
      const outs: Output[] = await outputsRes.json()
      setHasOutput(outs.length > 0)
    }

    if (allCaptureRes.ok) {
      const caps: Capture[] = await allCaptureRes.json()
      const thisMonth = caps.filter((c) => c.createdAt >= monthStart).length
      setStats((prev) => ({ ...prev, capturesThisMonth: thisMonth }))
    }

    if (allOutputsRes.ok) {
      const outputs: Output[] = await allOutputsRes.json()
      setRecentOutputs(outputs)
      setStats((prev) => ({ ...prev, outputsGenerated: outputs.length }))
    }

    if (draftRes.ok) {
      const drafts: Output[] = await draftRes.json()
      setStats((prev) => ({ ...prev, draftsAwaitingReview: drafts.length }))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const isFirstSession =
    !!profile?.onboarding_completed_at && !profile?.first_session_dismissed_at

  // Auto-dismiss when checklist is fully complete
  const profileComplete = !!(profile?.display_name && (profile?.tone_notes || profile?.role))
  const allComplete = profileComplete && hasCapture && hasOutput

  useEffect(() => {
    if (allComplete && isFirstSession) {
      const t = setTimeout(() => handleDismiss(), 1500)
      return () => clearTimeout(t)
    }
  }, [allComplete, isFirstSession])

  async function handleDismiss() {
    setExiting(true)
    await fetch('/api/profile/dismiss-first-session', { method: 'POST' })
    setTimeout(() => {
      setProfile((prev) => prev ? { ...prev, first_session_dismissed_at: new Date().toISOString() } : prev)
      setExiting(false)
    }, 400)
  }

  async function handleSaveToStudio() {
    const text = draftEditing ? draftText : (generation?.draft_post ?? '')
    if (!text.trim()) return
    setSavingToStudio(true)

    try {
      const captureRes = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'text', raw_content: text }),
      })
      if (!captureRes.ok) return

      const { id: captureId } = await captureRes.json()

      const genRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ capture_id: captureId }),
      })
      if (!genRes.ok) return

      const { output_id } = await genRes.json()
      router.push(`/studio/${output_id}`)
    } finally {
      setSavingToStudio(false)
    }
  }

  async function handleQuickCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!quickCapture.trim()) return
    setCapturing(true)
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'text', raw_content: quickCapture }),
      })
      if (res.ok) {
        setQuickCapture('')
        setCaptureSuccess(true)
        setTimeout(() => setCaptureSuccess(false), 3000)
        load()
      }
    } catch {}
    setCapturing(false)
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-zinc-200 bg-zinc-100" />
        ))}
      </div>
    )
  }

  // ── First-session view ─────────────────────────────────────────────────────
  if (isFirstSession) {
    const firstName = profile?.display_name?.split(' ')[0] ?? null
    const role = profile?.role ?? profile?.industry ?? null
    const channels = profile?.channels ?? []
    const positioningFull = generation?.positioning ?? ''
    const positioningIntro = positioningFull.split('. ')[0] ?? positioningFull
    const draft = generation?.draft_post ?? ''
    const channel = generation?.post_ideas?.[0]?.channel ?? channels[0] ?? null

    return (
      <div
        className={cn(
          'space-y-8 transition-opacity duration-400',
          exiting && 'opacity-0'
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              {firstName
                ? `Welcome, ${firstName}. Your${role ? ` ${role}` : ''} content strategy is ready.`
                : 'Your content strategy is ready.'}
            </h1>
            {positioningIntro && (
              <p className="text-sm text-zinc-500 leading-relaxed">{positioningIntro}.</p>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 ml-6 mt-0.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Skip
          </button>
        </div>

        {/* ── Strategy cards ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Positioning */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Your Positioning</p>
            {positioningFull ? (
              <p className="text-sm text-zinc-700 leading-relaxed line-clamp-4">{positioningFull}</p>
            ) : (
              <p className="text-sm text-zinc-400 italic">Complete your profile to generate positioning.</p>
            )}
          </div>

          {/* Channels */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Recommended Channels</p>
            {channels.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {channels.map((ch) => (
                  <span
                    key={ch}
                    className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-700"
                  >
                    {ch}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400 italic">No channels selected yet.</p>
            )}
          </div>

          {/* Cadence */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Publishing Cadence</p>
            {channels.length > 0 ? (
              <div className="space-y-1">
                {channels.map((ch) => (
                  <div key={ch} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700">{ch}</span>
                    <span className="text-xs text-zinc-400">{CADENCE[ch] ?? '2× per week'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">{getCadence([])}</p>
            )}
          </div>
        </div>

        {/* ── Primary CTA ── */}
        <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-white">Capture a thought</p>
            <p className="text-sm text-zinc-400 mt-0.5">Raw, half-formed, doesn't matter. Clout will shape it.</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/capture/new"
              className="rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Capture now →
            </Link>
            <span className="text-xs text-zinc-500 hidden sm:block">
              or <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-zinc-300">⌘K</kbd>
            </span>
          </div>
        </div>

        {/* ── Draft post ── */}
        {draft && (
          <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Your first draft</p>
                {channel && (
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] text-zinc-500">
                    {channel}
                  </span>
                )}
              </div>
              <button
                onClick={() => setDraftExpanded((v) => !v)}
                className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                {draftExpanded ? 'Collapse' : 'Expand'}
              </button>
            </div>

            <div className="px-5 py-4">
              {draftEditing ? (
                <textarea
                  className="w-full resize-none text-sm text-zinc-800 leading-relaxed bg-zinc-50 rounded-md border border-zinc-200 px-3 py-2.5 focus:outline-none focus:border-zinc-400 min-h-[140px]"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  autoFocus
                />
              ) : (
                <p className={cn(
                  'text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap',
                  !draftExpanded && 'line-clamp-4'
                )}>
                  {draft}
                </p>
              )}
            </div>

            <div className="border-t border-zinc-100 px-5 py-3 flex items-center gap-2 bg-zinc-50">
              {draftEditing ? (
                <>
                  <button
                    onClick={handleSaveToStudio}
                    disabled={savingToStudio || !draftText.trim()}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      savingToStudio || !draftText.trim()
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-700'
                    )}
                  >
                    {savingToStudio && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <BookMarked className="h-3.5 w-3.5" />
                    {savingToStudio ? 'Saving...' : 'Save to Studio'}
                  </button>
                  <button
                    onClick={() => { setDraftEditing(false); setDraftText(draft) }}
                    className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setDraftEditing(true); setDraftText(draft) }}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={handleSaveToStudio}
                    disabled={savingToStudio}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      savingToStudio
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                        : 'bg-zinc-900 text-white hover:bg-zinc-700'
                    )}
                  >
                    {savingToStudio && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <BookMarked className="h-3.5 w-3.5" />
                    {savingToStudio ? 'Saving...' : 'Save to Studio'}
                  </button>
                  <button
                    onClick={() => router.push(`/capture/new?content=${encodeURIComponent(draft)}`)}
                    className="flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Remix
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Activation checklist ── */}
        <div className="rounded-lg border border-zinc-200 bg-white p-5 space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-3">Getting started</p>
          <ChecklistItem
            done={profileComplete}
            label="Complete your profile"
            href="/settings/profile"
          />
          <ChecklistItem
            done={hasCapture}
            label="Capture your first thought"
            href="/capture/new"
          />
          <ChecklistItem
            done={hasOutput}
            label="Save your first post"
            href="/studio"
          />
          <ChecklistItem
            done={false}
            label="Connect your first channel"
            href="/channels"
            locked={!hasOutput}
          />
        </div>
      </div>
    )
  }

  // ── Regular dashboard ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Your thought leadership command center.</p>
        </div>
        <Link
          href="/capture/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          + New Capture
        </Link>
      </div>

      {/* Quick capture */}
      <form onSubmit={handleQuickCapture} className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex gap-3">
          <textarea
            className="flex-1 resize-none rounded-md bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none min-h-[72px]"
            placeholder="What's on your mind? Capture it here..."
            value={quickCapture}
            onChange={(e) => setQuickCapture(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleQuickCapture(e as unknown as React.FormEvent)
            }}
          />
          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={capturing || !quickCapture.trim()}
              className={cn(
                'rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                capturing || !quickCapture.trim()
                  ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                  : captureSuccess
                  ? 'bg-zinc-700 text-white'
                  : 'bg-zinc-900 text-white hover:bg-zinc-700'
              )}
            >
              {capturing ? 'Saving...' : captureSuccess ? 'Saved ✓' : '⌘↵ Capture'}
            </button>
          </div>
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Captures this month', value: stats.capturesThisMonth },
          { label: 'Outputs generated', value: stats.outputsGenerated },
          { label: 'Drafts awaiting review', value: stats.draftsAwaitingReview },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-zinc-200 bg-white p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-zinc-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Recent outputs */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-900">Recent outputs</h2>
        {recentOutputs.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-medium text-zinc-900">No outputs yet</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Start by capturing a raw thought. Clout will turn it into publish-ready content in under 60 seconds.
              </p>
              <Link
                href="/capture/new"
                className="mt-4 rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Create your first capture
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {recentOutputs.map((output) => (
              <Link
                key={output.id}
                href={`/studio/${output.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 line-clamp-1">
                    {output.title ?? 'Untitled output'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{timeAgo(output.createdAt)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  output.status === 'approved' ? 'bg-zinc-100 text-zinc-700' :
                  output.status === 'review' ? 'bg-zinc-200 text-zinc-600' :
                  'bg-zinc-100 text-zinc-600'
                }`}>
                  {output.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Checklist item ────────────────────────────────────────────────────────────

function ChecklistItem({
  done,
  label,
  href,
  locked = false,
}: {
  done: boolean
  label: string
  href: string
  locked?: boolean
}) {
  const inner = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors',
        locked
          ? 'opacity-40 cursor-not-allowed'
          : done
          ? 'cursor-default'
          : 'hover:bg-zinc-50 cursor-pointer'
      )}
    >
      <span className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
        done ? 'border-zinc-900 bg-zinc-900' : 'border-zinc-300'
      )}>
        {done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
        {!done && !locked && <Circle className="h-2 w-2 text-transparent" />}
      </span>
      <span className={cn(
        'text-sm',
        done ? 'text-zinc-400 line-through' : 'text-zinc-700'
      )}>
        {label}
      </span>
      {locked && (
        <span className="ml-auto text-[10px] text-zinc-300 font-medium uppercase tracking-wide">
          After first post
        </span>
      )}
    </div>
  )

  if (done || locked) return inner

  return <Link href={href}>{inner}</Link>
}
