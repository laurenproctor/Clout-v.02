'use client'

import { useState } from 'react'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProfileSettingsPage() {
  const [operatorVisible, setOperatorVisible] = useState(false)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    // TODO: call server action to update profiles.private_feed_operator_visible
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Profile</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Your thought leader identity and preferences.
        </p>
      </div>

      {/* Identity */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <h2 className="text-sm font-medium text-zinc-900">Identity</h2>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Display name
          </label>
          <input
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
            placeholder="Your name"
            disabled
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
            Bio
          </label>
          <textarea
            className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none"
            rows={3}
            placeholder="What do you stand for?"
            disabled
          />
        </div>
        <p className="text-xs text-zinc-400">Full profile editing coming soon.</p>
      </div>

      {/* Private feed visibility */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-zinc-400" />
          <h2 className="text-sm font-medium text-zinc-900">Private Feed</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Control whether your assigned operator can see your Private feed.
        </p>

        <div className="space-y-3">
          {[
            {
              value: false,
              label: 'Keep it private',
              description: 'Only you can see your Private feed.',
            },
            {
              value: true,
              label: 'Allow operator access',
              description: 'Your assigned operator can see your Private feed.',
            },
          ].map(({ value, label, description }) => (
            <button
              key={String(value)}
              onClick={() => setOperatorVisible(value)}
              className={cn(
                'w-full rounded-lg border p-4 text-left transition-colors',
                operatorVisible === value
                  ? 'border-zinc-900 bg-zinc-50'
                  : 'border-zinc-200 hover:border-zinc-300'
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-4 w-4 shrink-0 rounded-full border-2 transition-colors',
                    operatorVisible === value
                      ? 'border-zinc-900 bg-zinc-900'
                      : 'border-zinc-300'
                  )}
                />
                <div>
                  <p className="text-sm font-medium text-zinc-900">{label}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
        >
          {saved ? 'Saved ✓' : 'Save preference'}
        </button>
      </div>
    </div>
  )
}
