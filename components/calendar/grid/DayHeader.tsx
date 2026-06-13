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
  weekday: number // 0=Sun .. 6=Sat, in the workspace timezone
  dayNum: number
  isToday: boolean
}

export function DayHeader({ weekday, dayNum, isToday }: DayHeaderProps) {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayName = dayNames[weekday]
  const intent = DAY_INTENTS[weekday]

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
