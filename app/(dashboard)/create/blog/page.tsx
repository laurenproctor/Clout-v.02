// app/(dashboard)/create/blog/page.tsx
import {
  Search,
  Type,
  AlignLeft,
  LayoutList,
  Image,
  Wand2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const sections: { label: string; icon: LucideIcon }[] = [
  { label: 'Primary Keyword', icon: Search },
  { label: 'Meta Title', icon: Type },
  { label: 'Meta Description', icon: AlignLeft },
  { label: 'Content Structure', icon: LayoutList },
  { label: 'Images', icon: Image },
  { label: 'Draft Generation', icon: Wand2 },
]

export default function BlogCreatePage() {
  return (
    <div className="mx-auto max-w-4xl px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="mb-2 font-[Signifier] text-2xl font-semibold text-zinc-900">
          Blog Post Creation
        </h1>
        <p className="text-sm text-zinc-500">
          Create SEO-ready long-form content with metadata, structure, imagery, and AI-assisted
          drafting workflows.
        </p>
      </div>

      {/* Placeholder section cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map(({ label, icon: Icon }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-8 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-100">
              <Icon className="h-5 w-5 text-zinc-400" />
            </div>
            <p className="text-sm font-medium text-zinc-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
