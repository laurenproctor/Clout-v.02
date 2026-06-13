'use client'

import { DayHeader } from './DayHeader'
import { ConceptCard } from './ConceptCard'
import type { CalendarConcept } from '@/types/calendar'
import { TIME_SLOTS, nearestSlotHour } from '@/lib/calendar/slots'
import { zonedWeekDays, zonedDateKey, zonedHour } from '@/lib/calendar/timezone'

interface GridViewProps {
  concepts: CalendarConcept[]
  weekStart: string
  timezone: string
  selectedConceptId: string | null
  onSelectConcept: (id: string) => void
}

export function GridView({
  concepts,
  weekStart,
  timezone,
  selectedConceptId,
  onSelectConcept,
}: GridViewProps) {
  const days = zonedWeekDays(weekStart, timezone, 5)
  const todayKey = zonedDateKey(new Date().toISOString(), timezone)

  // Match each concept to its day/slot using the workspace timezone, so the day
  // column and the slot hour are read off the same clock the user scheduled in.
  function getConceptsForSlot(dateKey: string, hour: number): CalendarConcept[] {
    return concepts.filter((c) => {
      return (
        zonedDateKey(c.scheduledAt, timezone) === dateKey &&
        nearestSlotHour(zonedHour(c.scheduledAt, timezone)) === hour
      )
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
          <DayHeader
            key={i}
            weekday={day.weekday}
            dayNum={day.dayNum}
            isToday={day.dateKey === todayKey}
          />
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
              const slotConcepts = getConceptsForSlot(day.dateKey, hour)

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
