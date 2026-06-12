'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { GOAL_VALUES, GOAL_LABELS, GOAL_BADGE } from '@/lib/content/goals'
import type { Campaign, CampaignStatus, NarrativeGoal } from '@/types/domain'

const MIN_PURPOSE = 20
const STATUSES: CampaignStatus[] = ['active', 'paused', 'archived']

export function CampaignEditForm({
  campaign,
  onSaved,
  onCancel,
}: {
  campaign: Campaign
  onSaved: (updated: Campaign) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(campaign.name)
  const [goal, setGoal] = useState<NarrativeGoal>(campaign.goal)
  const [purpose, setPurpose] = useState(campaign.purpose)
  const [status, setStatus] = useState<CampaignStatus>(campaign.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nameValid = name.trim().length > 0
  const purposeValid = purpose.trim().length >= MIN_PURPOSE
  const canSave = nameValid && purposeValid

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), goal, purpose: purpose.trim(), status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to update campaign')
        return
      }
      onSaved(await res.json())
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5 rounded-lg border border-zinc-200 bg-white p-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Campaign name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
        />
        {!nameValid && <p className="mt-1 text-xs text-red-500">A campaign name is required.</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Strategic goal</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {GOAL_VALUES.map((g) => {
            const selected = goal === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setGoal(g)}
                className={cn(
                  'rounded-lg border p-2 text-left text-xs font-semibold transition-colors',
                  selected
                    ? cn(GOAL_BADGE[g], 'ring-2 ring-offset-1 ring-zinc-300')
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                )}
              >
                {GOAL_LABELS[g]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">
          What should this campaign make happen?
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          rows={3}
          className="w-full resize-y rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
        />
        {!purposeValid && (
          <p className="mt-1 text-xs text-red-500">
            Purpose must be at least {MIN_PURPOSE} characters.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-500">Status</label>
        <div className="flex gap-1 rounded-lg border border-zinc-200 bg-white p-1 w-fit">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                status === s ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !canSave}
          className={cn(
            'rounded-md px-4 py-2 text-sm font-medium transition-colors',
            saving || !canSave
              ? 'cursor-not-allowed bg-zinc-200 text-zinc-400'
              : 'bg-zinc-900 text-white hover:bg-zinc-700'
          )}
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}
