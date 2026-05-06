import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { listLenses } from '@/lib/domain/lens'
import { PRESET_LENSES } from '@/lib/syndication/types/lenses'
import type { SyndicationLens } from '@/lib/syndication/types/lenses'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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

  return NextResponse.json({ lenses: [...presets, ...workspace] })
}
