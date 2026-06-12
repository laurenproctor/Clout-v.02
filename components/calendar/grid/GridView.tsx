'use client'

import { DayHeader } from './DayHeader'
import { ConceptCard } from './ConceptCard'
import type { CalendarConcept } from '@/types/calendar'

const TIME_SLOTS = [
  { label: '7am', hour: 7 },
  { label: '9am', hour: 9 },
  { label: '12pm', hour: 12 },
  { label: '2pm', hour: 14 },
  { label: '5pm', hour: 17 },
]

interface GridViewProps {
  concepts: CalendarConcept[]
  weekStart: string
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

function getWeekDates(weekStart: string): Date[] {
  const start = new Date(weekStart)
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    return d
  })
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  )
}

export function GridView({
  concepts,
  weekStart,
  selectedConceptId,
  onSelectConcept,
}: GridViewProps) {
  const days = getWeekDates(weekStart)
  const today = new Date()

  function getConceptsForSlot(day: Date, hour: number): CalendarConcept[] {
    return concepts.filter((c) => {
      const d = new Date(c.scheduledAt)
      return isSameDay(d, day) && d.getHours() === hour
    })
  }

  if (concepts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <span className="text-4xl text-zinc-200">⬡</span>
        <p className="text-[13px] font-semibold text-zinc-400">
          No concepts scheduled this week
        </p>
        <p className="text-[11px] text-zinc-300">
          Generate from signals or create manually
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Day headers */}
      <div className="grid grid-cols-[44px_repeat(5,1fr)] gap-2 mb-2">
        <div />
        {days.map((day, i) => (
          <DayHeader key={i} date={day} isToday={isSameDay(day, today)} />
        ))}
      </div>

      {/* Time rows */}
      <div className="flex flex-col gap-2">
        {TIME_SLOTS.map(({ label, hour }) => (
          <div
            key={hour}
            className="grid grid-cols-[44px_repeat(5,1fr)] gap-2 items-start"
          >
            {/* Time label */}
            <div className="text-[9px] text-zinc-300 text-right pr-2 pt-2.5 tracking-wide">
              {label}
            </div>

            {/* Day cells */}
            {days.map((day, dayIdx) => {
              const slotConcepts = getConceptsForSlot(day, hour)

              if (slotConcepts.length === 0) {
                return (
                  <div
                    key={dayIdx}
                    className="min-h-[52px] rounded-lg bg-white border border-zinc-100"
                  />
                )
              }

              return (
                <div key={dayIdx} className="flex flex-col gap-2">
                  {slotConcepts.map((concept, idx) => (
                    <ConceptCard
                      key={concept.conceptId}
                      concept={concept}
                      isSelected={selectedConceptId === concept.conceptId}
                      onSelect={() => onSelectConcept(concept.conceptId)}
                      showCausalArrow={
                        idx === slotConcepts.length - 1 &&
                        concept.narrativeArcId !== null &&
                        dayIdx < 4
                      }
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
