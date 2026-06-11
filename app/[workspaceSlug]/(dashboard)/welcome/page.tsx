'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '@/components/providers/workspace-provider'
import type { ActivationStatus } from '@/lib/domain/activation'

// Replace console.log calls with your analytics provider once one is wired in.
function trackEvent(event: string, props: Record<string, unknown>) {
  console.log('[activation]', event, props)
}

interface ActionCard {
  key: keyof Pick<ActivationStatus, 'brand' | 'publishing' | 'signals'>
  title: string
  description: string
  href: (slug: string) => string
  action: string
}

const SECONDARY_CARDS: ActionCard[] = [
  {
    key: 'brand',
    title: 'Set up your brand',
    description: 'Colors, fonts, logo, and tone — the foundation for all your visuals and content.',
    href: (slug) => `/${slug}/settings/brand`,
    action: 'brand_setup',
  },
  {
    key: 'publishing',
    title: 'Connect your channels',
    description: 'Link LinkedIn, X, Threads, and your owned platforms so you can publish directly.',
    href: (slug) => `/${slug}/settings/publishing`,
    action: 'publishing_setup',
  },
  {
    key: 'signals',
    title: 'Explore signals',
    description: 'Track competitors and market intelligence to find what to write about.',
    href: (slug) => `/${slug}/settings/feed?setup=1`,
    action: 'signals_setup',
  },
]

export default function WelcomePage() {
  const { id: workspaceId, slug, name } = useWorkspace()
  const [status, setStatus] = useState<ActivationStatus | null>(null)
  const [firstName, setFirstName] = useState<string | null>(null)

  useEffect(() => {
    // Clear any stale onboarding state that may have survived unusual navigation.
    sessionStorage.removeItem('onboarding-workspace-slug')

    async function load() {
      const [activationRes, profileRes] = await Promise.all([
        fetch('/api/activation/status'),
        fetch('/api/profile'),
      ])

      if (activationRes.ok) {
        const data: ActivationStatus = await activationRes.json()
        setStatus(data)
        trackEvent('welcome_page_viewed', {
          workspaceId,
          completedSteps: data.completedSteps,
          totalSteps: data.totalSteps,
        })
      }

      if (profileRes.ok) {
        const profile = await profileRes.json()
        setFirstName(profile?.display_name?.split(' ')[0] ?? null)
      }
    }

    load()
  }, [workspaceId])

  const greeting = firstName ?? name ?? 'there'
  const completedSteps = status?.completedSteps ?? 0
  const totalSteps = status?.totalSteps ?? 4

  return (
    <div className="mx-auto max-w-2xl py-10 px-4">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">
          Welcome, {greeting}. Your workspace is ready.
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Where would you like to start?
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 rounded-full transition-all duration-500"
            style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-zinc-400 tabular-nums">
          {completedSteps} of {totalSteps} complete
        </span>
      </div>

      {/* Primary CTA — Capture */}
      <Link
        href={`/${slug}/capture/new`}
        onClick={() => trackEvent('welcome_action_selected', { workspaceId, action: 'first_capture' })}
        className={cn(
          'group mb-4 flex items-center justify-between rounded-xl border-2 p-5 transition-all',
          status?.capture
            ? 'border-zinc-200 bg-zinc-50'
            : 'border-zinc-900 bg-zinc-900 hover:bg-zinc-800'
        )}
      >
        <div className="flex items-start gap-4">
          <CompletionIcon done={status?.capture ?? false} primary />
          <div>
            <p className={cn('font-semibold', status?.capture ? 'text-zinc-500' : 'text-white')}>
              Capture your first idea
            </p>
            <p className={cn('mt-0.5 text-sm', status?.capture ? 'text-zinc-400' : 'text-zinc-300')}>
              Drop a URL, voice note, or raw thought — Clout will turn it into content.
            </p>
          </div>
        </div>
        <ArrowRight
          className={cn(
            'ml-4 h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5',
            status?.capture ? 'text-zinc-400' : 'text-white'
          )}
        />
      </Link>

      {/* Secondary cards */}
      <div className="space-y-3">
        {SECONDARY_CARDS.map((card) => {
          const done = status?.[card.key] ?? false
          return (
            <Link
              key={card.key}
              href={card.href(slug)}
              onClick={() => trackEvent('welcome_action_selected', { workspaceId, action: card.action })}
              className={cn(
                'group flex items-center justify-between rounded-xl border p-5 transition-all',
                done
                  ? 'border-zinc-100 bg-zinc-50 hover:border-zinc-200'
                  : 'border-zinc-200 bg-white hover:border-zinc-400'
              )}
            >
              <div className="flex items-start gap-4">
                <CompletionIcon done={done} />
                <div>
                  <p className={cn('font-medium text-sm', done ? 'text-zinc-400' : 'text-zinc-900')}>
                    {card.title}
                    {done && <span className="ml-2 text-xs font-normal text-zinc-400">Done</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-400">{card.description}</p>
                </div>
              </div>
              {!done && (
                <span className="ml-4 shrink-0 text-xs font-medium text-zinc-500 group-hover:text-zinc-900 transition-colors">
                  Start →
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <Link
          href={`/${slug}/dashboard`}
          onClick={() => trackEvent('welcome_action_selected', { workspaceId, action: 'dashboard' })}
          className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          Go to dashboard →
        </Link>
      </div>
    </div>
  )
}

function CompletionIcon({ done, primary = false }: { done: boolean; primary?: boolean }) {
  if (done) {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
  }
  return (
    <Circle
      className={cn(
        'mt-0.5 h-5 w-5 shrink-0',
        primary ? 'text-zinc-500' : 'text-zinc-300'
      )}
    />
  )
}
