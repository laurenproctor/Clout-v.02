import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'
import { SyndicationClient } from './SyndicationClient'
import { redirect } from 'next/navigation'

export default async function SyndicationPage() {
  const session = await getSession()
  if (!session) redirect('/sign-in')

  const workspaceLensesResult = await listLenses({ workspaceId: session.workspaceId })
  const workspaceLenses = workspaceLensesResult.ok ? workspaceLensesResult.data : []

  const presets: SyndicationLens[] = PRESET_LENSES.map((l) => ({
    id: l.name,
    name: l.name,
    rhetoricalModifier: l.rhetoricalModifier,
    isPreset: true,
  }))

  const workspace: SyndicationLens[] = workspaceLenses.map((l) => ({
    id: l.id,
    name: l.name,
    rhetoricalModifier: l.systemPrompt,
    isPreset: false,
  }))

  return <SyndicationClient availableLenses={[...presets, ...workspace]} />
}
