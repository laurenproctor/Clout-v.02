import { Skeleton, SkeletonList } from "@/components/ui/skeleton"

export function SettingsPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <SkeletonList count={2} rowClassName="h-16" />
      </div>
    </div>
  )
}
