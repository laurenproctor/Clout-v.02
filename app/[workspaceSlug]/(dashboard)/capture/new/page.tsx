'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { useWorkspace } from '@/components/providers/workspace-provider'
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

const TAGLINES = [
  'Great ideas start messy.',
  'Every polished post was once a rough thought.',
  'The best drafts begin imperfect.',
  'Raw thinking is where originality lives.',
  'Fragments are fine. Start there.',
  'Clarity comes after capture.',
  'No one sees the first draft.',
  'Good writing is rewriting. Start anywhere.',
]

function RotatingTagline() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const cycle = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setIndex(i => (i + 1) % TAGLINES.length)
        setVisible(true)
      }, 400)
    }, 3500)
    return () => clearInterval(cycle)
  }, [])

  return (
    <p
      className="text-center text-sm text-zinc-400 transition-all duration-400"
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(4px)' }}
    >
      {TAGLINES[index]}
    </p>
  )
}

export default function NewCapturePage() {
  return (
    <Suspense>
      <NewCaptureInner />
    </Suspense>
  )
}

function NewCaptureInner() {
  const { slug } = useWorkspace()
  const searchParams = useSearchParams()
  const [headline] = useState(() => HEADLINES[Math.floor(Math.random() * HEADLINES.length)])

  const initialContent = searchParams.get('content') ?? ''
  const modeParam = searchParams.get('mode')
  const initialMode = modeParam === 'voice' ? 'voice' as const : modeParam === 'write' ? 'write' as const : 'assistant' as const

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/${slug}/capture`} className="text-zinc-400 hover:text-zinc-700 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">{headline.heading}</h1>
          <p className="text-sm text-zinc-400 mt-0.5">{headline.subheading}</p>
        </div>
      </div>

      <CaptureComposer initialContent={initialContent} initialMode={initialMode} />

      <RotatingTagline />
    </div>
  )
}
