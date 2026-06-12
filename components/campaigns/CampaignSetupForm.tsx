'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { GOAL_VALUES, GOAL_LABELS, GOAL_DESCRIPTIONS, GOAL_BADGE } from '@/lib/content/goals'
import type { NarrativeGoal } from '@/types/calendar'

const MIN_PURPOSE = 20

export function CampaignSetupForm() {
  const router = useRouter()
  const { slug } = useWorkspace()

  const [name, setName] = useState('')
  const [goal, setGoal] = useState<NarrativeGoal | null>(null)
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  const nameValid = name.trim().length > 0
  const purposeValid = purpose.trim().length >= MIN_PURPOSE
  const canSubmit = nameValid && goal !== null && purposeValid

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), goal, purpose: purpose.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to create campaign')
        return
      }
      const campaign = await res.json()
      router.push(`/${slug}/campaigns/${campaign.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Campaign name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Q3 Authority Push"
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        {touched && !nameValid && (
          <p className="mt-1 text-xs text-red-500">A campaign name is required.</p>
        )}
      </div>

      {/* Goal */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Strategic goal</label>
        <p className="mb-2 text-xs text-zinc-400">Every campaign needs one strategic objective.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOAL_VALUES.map((g) => {
            const selected = goal === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={cn(
                  'flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-colors',
                  selected
                    ? cn(GOAL_BADGE[g], 'ring-2 ring-offset-1 ring-zinc-300')
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                )}
              >
                <span className="text-xs font-semibold">{GOAL_LABELS[g]}</span>
                <span className={cn('text-[11px] leading-tight', selected ? 'opacity-80' : 'text-zinc-400')}>
                  {GOAL_DESCRIPTIONS[g]}
                </span>
              </button>
            )
          })}
        </div>
        {touched && goal === null && (
          <p className="mt-1 text-xs text-red-500">Choose a strategic goal.</p>
        )}
      </div>

      {/* Purpose */}
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          What should this campaign make happen?
        </label>
        <p className="mb-2 text-xs text-zinc-400">
          A goal category alone is not a purpose — the goal gives the campaign a strategic lane;
          the purpose gives the AI the actual reason for creating content.
        </p>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={4}
          placeholder="e.g. Build credibility with boutique agency founders by showing how Clout turns market signals into campaign-ready content."
          className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />
        {touched && !purposeValid && (
          <p className="mt-1 text-xs text-red-500">
            Describe what this campaign is meant to accomplish (at least {MIN_PURPOSE} characters).
          </p>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || (touched && !canSubmit)}
          className={cn(
            'rounded-md px-5 py-2 text-sm font-medium transition-colors',
            submitting || (touched && !canSubmit)
              ? 'cursor-not-allowed bg-zinc-200 text-zinc-400'
              : 'bg-zinc-900 text-white hover:bg-zinc-700'
          )}
        >
          {submitting ? 'Creating…' : 'Create campaign'}
        </button>
      </div>
    </form>
  )
}
