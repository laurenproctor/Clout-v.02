'use client'

import { useState, useEffect } from 'react'
import type { NarrativeStrategy } from '@/lib/blog/types'

interface NarrativeStrategyCardProps {
  strategy: NarrativeStrategy
  editable: boolean
  onChange: (strategy: NarrativeStrategy) => void
}

export function NarrativeStrategyCard({ strategy, editable, onChange }: NarrativeStrategyCardProps) {
  const [draft, setDraft] = useState(strategy)

  useEffect(() => {
    setDraft(strategy)
  }, [strategy])

  function set(patch: Partial<NarrativeStrategy>) {
    const updated = { ...draft, ...patch }
    setDraft(updated)
    onChange(updated)
  }

  const Field = ({ label, field, multiline }: { label: string; field: keyof NarrativeStrategy; multiline?: boolean }) => {
    const value = draft[field]
    if (typeof value !== 'string') return null

    return (
      <div>
        <label className="text-xs font-medium text-zinc-500 mb-1 block">{label}</label>
        {editable ? (
          multiline ? (
            <textarea
              value={value}
              onChange={e => set({ [field]: e.target.value } as Partial<NarrativeStrategy>)}
              rows={2}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 resize-none"
            />
          ) : (
            <input
              type="text"
              value={value}
              onChange={e => set({ [field]: e.target.value } as Partial<NarrativeStrategy>)}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            />
          )
        ) : (
          <p className="text-sm text-zinc-700">{value}</p>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-zinc-900 mb-4">Narrative Strategy</h3>
      <div className="space-y-4">
        <Field label="Core Argument" field="coreArgument" />
        <Field label="Tension" field="tension" multiline />
        <Field label="Stakes" field="stakes" multiline />
        <Field label="Content Angle" field="contentAngle" />
        <Field label="Audience Belief Shift" field="audienceBeliefShift" multiline />
        {draft.opposingView && <Field label="Opposing View" field="opposingView" />}
      </div>
    </div>
  )
}
