// app/(dashboard)/create/page.tsx
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { listLenses } from '@/lib/domain/lens'
import { activeTypes, comingSoonTypes } from '@/lib/content/contentTypes'
import { CreateCard } from '@/components/create/CreateCard'
import { UniversalCreateComposer } from '@/components/create/UniversalCreateComposer'

export default async function CreatePage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>
  searchParams: Promise<{ campaign?: string }>
}) {
  const { workspaceSlug } = await params
  const { campaign } = await searchParams

  const supabase = createServiceClient()
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', workspaceSlug)
    .is('deleted_at', null)
    .maybeSingle()
  if (!workspace) notFound()

  const lensesResult = await listLenses({ workspaceId: workspace.id })
  const brandLenses = lensesResult.ok ? lensesResult.data : []

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 font-[Signifier] text-2xl font-semibold text-zinc-900">
          Create content
        </h1>
        <p className="text-sm text-zinc-500">
          Turn ideas, sources, and drafts into platform-native content.
        </p>
      </div>

      {/* Universal composer — idea-led "Start from anything" */}
      <section className="mb-10">
        <UniversalCreateComposer workspaceSlug={workspaceSlug} brandLenses={brandLenses} />
      </section>

      {/* Channel-specific creators — destination-led */}
      {activeTypes.length > 0 && (
        <section id="create-for-channel" className="mb-8 scroll-mt-6">
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Create for a specific channel
          </p>
          <p className="mb-3 text-sm text-zinc-500">
            Choose a destination when you already know where this piece should start. You can adapt
            it into other channels after the first draft.
          </p>
          <div className="flex flex-col gap-3">
            {activeTypes.map((type) => (
              <CreateCard key={type.id} type={type} slug={workspaceSlug} variant="featured" campaign={campaign} />
            ))}
          </div>
        </section>
      )}

      {/* Coming soon types — 2-col grid */}
      {comingSoonTypes.length > 0 && (
        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Coming Soon
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {comingSoonTypes.map((type) => (
              <CreateCard key={type.id} type={type} slug={workspaceSlug} variant="grid" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
