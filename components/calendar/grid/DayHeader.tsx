import { cn } from '@/lib/utils'

const DAY_INTENTS: Record<number, string> = {
  1: 'Conversation · Tension',
  2: 'Authority · Education',
  3: 'Proof · Evidence',
  4: 'Lead Generation',
  5: 'Founder Narrative',
  6: 'Evergreen',
  0: 'Evergreen',
}

interface DayHeaderProps {
  date: Date
  isToday: boolean
}

export function DayHeader({ date, isToday }: DayHeaderProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[date.getUTCDay()]
  const dayNum = date.getUTCDate()
  const intent = DAY_INTENTS[date.getUTCDay()]

  return (
    <div className="text-center pb-1">
      <p
        className={cn(
          'text-[11px] font-bold uppercase tracking-wide',
          isToday ? 'text-indigo-600' : 'text-zinc-400'
        )}
      >
        {dayName} {dayNum}
        {isToday && ' ·'}
      </p>
      <p
        className={cn(
          'text-[9px] mt-0.5',
          isToday ? 'text-indigo-400' : 'text-zinc-300'
        )}
      >
        {intent}
      </p>
    </div>
  )
}
