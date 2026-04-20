'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 1 | 2 | 3

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [workspaceName, setWorkspaceName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [operatorVisible, setOperatorVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canAdvance =
    step === 1 ? workspaceName.trim().length > 0 :
    step === 2 ? displayName.trim().length > 0 :
    true

  async function next() {
    setLoading(true)
    setError(null)

    try {
      if (step === 1) {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'workspace', data: { name: workspaceName } }),
        })
        if (!res.ok) {
          const d = await res.json()
          // Non-fatal: workspace may already exist if user refreshes onboarding
          console.warn('Workspace creation:', d.error)
        }
        setStep(2)
      } else if (step === 2) {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'profile', data: { display_name: displayName, bio } }),
        })
        if (!res.ok) {
          const d = await res.json()
          console.warn('Profile update:', d.error)
        }
        setStep(3)
      } else {
        const res = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: 'privacy', data: { operator_visible: operatorVisible } }),
        })
        if (!res.ok) {
          const d = await res.json()
          console.warn('Privacy update:', d.error)
        }
        router.push('/dashboard')
      }
    } catch (err) {
      setError('Something went wrong. You can skip this step.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div
            key={s}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-zinc-900' : 'bg-zinc-200'
            )}
          />
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">Name your workspace</h1>
              <p className="mt-1 text-sm text-zinc-500">
                This is your thought leadership home. You can change it later.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Workspace name
              </label>
              <input
                autoFocus
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="e.g. Lauren's Workspace"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canAdvance && !loading && next()}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">Tell us about yourself</h1>
              <p className="mt-1 text-sm text-zinc-500">
                This becomes your thought leader profile — the context behind your content.
              </p>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Your name
              </label>
              <input
                autoFocus
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
                placeholder="e.g. Lauren Proctor"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Bio <span className="normal-case text-zinc-400">(optional)</span>
              </label>
              <textarea
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none resize-none"
                rows={3}
                placeholder="What do you stand for? What's your area of expertise?"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-zinc-400" />
                <h1 className="text-lg font-semibold text-zinc-900">Private feed visibility</h1>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                Clout Private is your personal journal — raw thoughts that never go public. If you have an operator assigned to your workspace, you choose whether they can see it.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  value: false,
                  label: 'Keep it private',
                  description: 'Only you can see your Private feed. Operators cannot access it.',
                },
                {
                  value: true,
                  label: 'Allow operator access',
                  description: 'Your assigned operator can see your Private feed to provide better assistance.',
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

            <p className="text-xs text-zinc-400">
              You can change this anytime in Settings → Profile.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-xs text-red-600">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => (s - 1) as Step)}
              disabled={loading}
              className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}
          <button
            onClick={next}
            disabled={!canAdvance || loading}
            className={cn(
              'rounded-md px-5 py-2 text-sm font-medium transition-colors',
              !canAdvance || loading
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-700'
            )}
          >
            {loading ? 'Saving...' : step === 3 ? 'Get started →' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  )
}
