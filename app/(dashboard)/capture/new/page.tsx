'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CaptureComposer } from '@/components/capture/capture-composer'

const HEADLINES: { heading: string; subheading: string }[] = [
  {
    heading: 'Turn raw thinking into publishable influence.',
    subheading: 'Fragments, links, notes, and voice become clear content in your voice.',
  },
  {
    heading: 'Turn unfinished thoughts into marketable ideas.',
    subheading: 'Capture anything. Clout shapes it into content people remember.',
  },
  {
    heading: 'Your best ideas deserve better than drafts.',
    subheading: 'Turn notes, links, and voice memos into polished content instantly.',
  },
  {
    heading: 'From signal to statement.',
    subheading: 'Bring fragments. Leave with finished content.',
  },
]

export default function NewCapturePage() {
  return (
    <Suspense>
      <NewCaptureInner />
    </Suspense>
  )
}

function NewCaptureInner() {
  const searchParams = useSearchParams()
  const [headline] = useState(() => HEADLINES[Math.floor(Math.random() * HEADLINES.length)])

  const initialContent = searchParams.get('content') ?? ''
  const initialMode = searchParams.get('mode') === 'voice' ? 'voice' as const : 'write' as const

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/capture" className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{headline.heading}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{headline.subheading}</p>
        </div>
      </div>

      <CaptureComposer initialContent={initialContent} initialMode={initialMode} />

      <p className="text-center text-sm text-zinc-400">
        Strong content rarely starts polished.
      </p>
    </div>
  )
}
