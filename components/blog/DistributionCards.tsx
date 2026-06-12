'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { GeneratedBlogPackage } from '@/lib/blog/types'
import { snapToNearestSlot } from '@/lib/calendar/slots'

interface DistributionCardsProps {
  distribution: GeneratedBlogPackage['distribution']
}

type Channel = 'linkedin' | 'xThread' | 'newsletter'

const CHANNELS: Array<{ key: Channel; label: string; description: string }> = [
  { key: 'linkedin', label: 'LinkedIn', description: 'Authority-forward, compressed argument' },
  { key: 'xThread', label: 'X Thread', description: 'Tension density, short idea units' },
  { key: 'newsletter', label: 'Newsletter', description: 'Intimate, continuation-optimized' },
]

type ActionState = 'idle' | 'saving' | 'queued' | 'scheduled' | 'error'

async function saveOutput(content: string, channel: Channel): Promise<string> {
  const res = await fetch('/api/blog/save-social-output', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, channel }),
  })
  if (!res.ok) throw new Error('Failed to save')
  const data = await res.json() as { id: string }
  return data.id
}

async function queueOutput(id: string): Promise<void> {
  const res = await fetch(`/api/outputs/${id}/queue`, { method: 'POST' })
  if (!res.ok) throw new Error('Failed to queue')
}

async function scheduleOutput(id: string, scheduledAt: Date): Promise<void> {
  const res = await fetch(`/api/outputs/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_at: scheduledAt.toISOString(), status: 'queued' }),
  })
  if (!res.ok) throw new Error('Failed to schedule')
}

function ChannelActions({ content, channel }: { content: string; channel: Channel }) {
  const [copied, setCopied] = useState(false)
  const [actionState, setActionState] = useState<ActionState>('idle')
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleQueue() {
    setActionState('saving')
    setErrorMsg('')
    try {
      const id = await saveOutput(content, channel)
      await queueOutput(id)
      setActionState('queued')
    } catch {
      setActionState('error')
      setErrorMsg('Failed to queue')
      setTimeout(() => setActionState('idle'), 3000)
    }
  }

  async function handleScheduleConfirm() {
    if (!scheduleValue) return
    setActionState('saving')
    setErrorMsg('')
    try {
      const id = await saveOutput(content, channel)
      await scheduleOutput(id, snapToNearestSlot(new Date(scheduleValue)))
      setActionState('scheduled')
      setShowSchedule(false)
      setScheduleValue('')
    } catch {
      setActionState('error')
      setErrorMsg('Failed to schedule')
      setTimeout(() => { setActionState('idle'); setShowSchedule(false) }, 3000)
    }
  }

  const isBusy = actionState === 'saving'
  const isSettled = actionState === 'queued' || actionState === 'scheduled'

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>

        {!isSettled && (
          <>
            <button
              type="button"
              onClick={handleQueue}
              disabled={isBusy}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              {actionState === 'saving' && !showSchedule ? 'Saving…' : 'Add to Queue'}
            </button>

            <button
              type="button"
              onClick={() => setShowSchedule(v => !v)}
              disabled={isBusy}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:bg-zinc-50 disabled:opacity-50"
            >
              Schedule
            </button>
          </>
        )}

        {actionState === 'queued' && (
          <span className="text-xs font-medium text-emerald-600">Added to queue ✓</span>
        )}
        {actionState === 'scheduled' && (
          <span className="text-xs font-medium text-emerald-600">Scheduled ✓</span>
        )}
        {actionState === 'error' && (
          <span className="text-xs text-red-500">{errorMsg}</span>
        )}
      </div>

      {showSchedule && !isSettled && (
        <div className="flex items-center gap-2 pt-1">
          <input
            type="datetime-local"
            value={scheduleValue}
            onChange={e => setScheduleValue(e.target.value)}
            className="flex-1 text-xs border border-zinc-200 rounded-md px-2.5 py-1.5 bg-white text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
          />
          <button
            onClick={handleScheduleConfirm}
            disabled={!scheduleValue || isBusy}
            className="text-xs font-medium text-zinc-900 px-3 py-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition-colors"
          >
            {isBusy ? 'Saving…' : 'Confirm'}
          </button>
          <button
            onClick={() => { setShowSchedule(false); setScheduleValue('') }}
            className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

export function DistributionCards({ distribution }: DistributionCardsProps) {
  const [active, setActive] = useState<Channel>('linkedin')

  const content = distribution[active]

  // When switching tabs, reset to the first channel with content
  const availableFirst = CHANNELS.find(ch => !!distribution[ch.key])
  if (availableFirst && !distribution[active] && availableFirst.key !== active) {
    setActive(availableFirst.key)
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white overflow-hidden">
      <div className="border-b border-zinc-100 px-5 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">Distribution</h3>
        <p className="text-xs text-zinc-400">Platform-adapted, not reformatted</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-zinc-100">
        {CHANNELS.map(ch => {
          const hasContent = !!distribution[ch.key]
          return (
            <button
              key={ch.key}
              type="button"
              onClick={() => hasContent && setActive(ch.key)}
              disabled={!hasContent}
              className={cn(
                'flex-1 px-4 py-2.5 text-xs font-medium transition-colors border-b-2',
                active === ch.key
                  ? 'border-zinc-900 text-zinc-900'
                  : hasContent
                  ? 'border-transparent text-zinc-500 hover:text-zinc-700'
                  : 'border-transparent text-zinc-300 cursor-not-allowed'
              )}
            >
              {ch.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        {content ? (
          <div key={active}>
            <pre className="whitespace-pre-wrap font-sans text-sm text-zinc-700 leading-relaxed">
              {content}
            </pre>
            <ChannelActions content={content} channel={active} />
          </div>
        ) : (
          <p className="text-sm text-zinc-400">No content generated for this channel.</p>
        )}
      </div>
    </div>
  )
}
