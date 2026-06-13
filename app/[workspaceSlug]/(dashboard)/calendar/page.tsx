import { Suspense } from 'react'
import { CalendarPage } from '@/components/calendar/CalendarPage'
import { ListPageSkeleton } from '@/components/loading/list-page-skeleton'

export default function Page() {
  return <Suspense fallback={<ListPageSkeleton />}><CalendarPage /></Suspense>
}
