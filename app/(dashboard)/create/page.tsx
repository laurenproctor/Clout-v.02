// app/(dashboard)/create/page.tsx
import { activeTypes, comingSoonTypes } from '@/lib/content/contentTypes'
import { CreateCard } from '@/components/create/CreateCard'

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 font-[Signifier] text-2xl font-semibold text-zinc-900">
          Create Content
        </h1>
        <p className="text-sm text-zinc-500">
          Generate platform-native content, long-form writing, and editorial assets from a single
          workflow.
        </p>
      </div>

      {/* Active types — full-width featured */}
      {activeTypes.length > 0 && (
        <section className="mb-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">
            Available Now
          </p>
          <div className="flex flex-col gap-3">
            {activeTypes.map((type) => (
              <CreateCard key={type.id} type={type} variant="featured" />
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
              <CreateCard key={type.id} type={type} variant="grid" />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
