'use client'

import type { PostCoaching } from '@/lib/linkedin/types'
import { Skeleton } from '@/components/ui/skeleton'

interface CoachingPanelProps {
  coaching: PostCoaching | null
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
      {children}
    </h3>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium text-zinc-400 mb-1 mt-3">{children}</p>
  )
}

function BulletList({ items, italic }: { items: string[]; italic?: boolean }) {
  return (
    <ul className="space-y-1 pl-3">
      {items.map((item, i) => (
        <li
          key={i}
          className={`text-sm list-disc ${italic ? 'text-zinc-500 italic' : 'text-zinc-700'}`}
        >
          {item}
        </li>
      ))}
    </ul>
  )
}

export function CoachingPanel({ coaching }: CoachingPanelProps) {
  if (!coaching) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-3 w-24" />
        <div className="space-y-2">
          <Skeleton className="h-2" />
          <Skeleton className="h-2 w-5/6" />
        </div>
      </div>
    )
  }

  const { readerPsychology, narrativeDynamics, positioningSignals } = coaching

  return (
    <div>
      {/* Reader Psychology */}
      <SectionHeader>Reader Psychology</SectionHeader>

      <FieldLabel>Opening retention</FieldLabel>
      <p className="text-sm text-zinc-700">{readerPsychology.openingRetention}</p>

      <FieldLabel>Drop-off risks</FieldLabel>
      <BulletList items={readerPsychology.dropOffRisks} italic />

      <FieldLabel>Engagement drivers</FieldLabel>
      <BulletList items={readerPsychology.engagementDrivers} />

      {/* Narrative Dynamics */}
      <div className="border-t border-zinc-100 pt-4 mt-4">
        <SectionHeader>Narrative Dynamics</SectionHeader>

        <FieldLabel>Tension mechanism</FieldLabel>
        <p className="text-sm text-zinc-700">{narrativeDynamics.tensionMechanism}</p>

        <FieldLabel>Pacing notes</FieldLabel>
        <p className="text-sm text-zinc-700">{narrativeDynamics.pacingNotes}</p>

        <FieldLabel>Closing strength</FieldLabel>
        <p className="text-sm text-zinc-700">{narrativeDynamics.closingStrength}</p>
      </div>

      {/* Positioning Signals */}
      <div className="border-t border-zinc-100 pt-4 mt-4">
        <SectionHeader>Positioning Signals</SectionHeader>

        <FieldLabel>Authority framing</FieldLabel>
        <p className="text-sm text-zinc-700">{positioningSignals.authorityFraming}</p>

        <FieldLabel>Audience fit</FieldLabel>
        <p className="text-sm text-zinc-700">{positioningSignals.audienceFit}</p>

        <FieldLabel>Improvement suggestions</FieldLabel>
        <BulletList items={positioningSignals.improvementSuggestions.slice(0, 3)} />
      </div>
    </div>
  )
}
