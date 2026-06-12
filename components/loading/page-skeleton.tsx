import { Skeleton, SkeletonList } from "@/components/ui/skeleton"

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <SkeletonList count={4} rowClassName="h-20" />
    </div>
  )
}
