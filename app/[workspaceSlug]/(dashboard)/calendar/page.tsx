import { Suspense } from 'react'
import { CalendarPage } from '@/components/calendar/CalendarPage'

export default function Page() {
  return <Suspense><CalendarPage /></Suspense>
}
