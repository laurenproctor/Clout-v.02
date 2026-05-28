'use client'

import { Suspense } from 'react'
import { EditorialIntelligenceCard } from '@/components/analytics/EditorialIntelligenceCard'

export default function AnalyticsSettingsPage() {
  return (
    <div className="space-y-8 p-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Editorial Intelligence</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Connect Google Analytics 4 and Search Console to measure content attribution and traffic intelligence.
        </p>
      </div>

      <Suspense>
        <EditorialIntelligenceCard />
      </Suspense>

      <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-500 space-y-1">
        <p className="font-medium text-zinc-700">What gets measured</p>
        <p>
          Every piece of content Clout publishes automatically receives UTM parameters. GA4 sessions arriving
          via those parameters are recorded as direct attributed traffic — measuring downstream reach, tracked
          referral conversions, and measured session quality per content batch.
        </p>
      </div>
    </div>
  )
}
