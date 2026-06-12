'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useWorkspace } from '@/components/providers/workspace-provider'
import { CampaignSetupForm } from '@/components/campaigns/CampaignSetupForm'

export default function NewCampaignPage() {
  const { slug } = useWorkspace()

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/${slug}/campaigns`}
          className="text-zinc-400 hover:text-zinc-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-zinc-900">New campaign</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Define the strategic objective your content will serve.
          </p>
        </div>
      </div>

      <CampaignSetupForm />
    </div>
  )
}
