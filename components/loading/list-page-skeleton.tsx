import { Skeleton, SkeletonList } from "@/components/ui/skeleton"

export function ListPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <SkeletonList count={5} rowClassName="h-16" />
      </div>
    </div>
  )
}
