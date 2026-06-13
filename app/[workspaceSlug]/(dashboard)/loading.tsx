import { PageSkeleton } from '@/components/loading/page-skeleton'

// Group-level navigation fallback for the dashboard shell. Shown while a route
// segment's module/data streams in; client pages additionally render their own
// in-component skeletons once mounted.
export default function Loading() {
  return <PageSkeleton />
}
