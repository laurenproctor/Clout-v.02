import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{
            width: i === lines - 1 ? "60%" : i % 3 === 1 ? "85%" : "100%",
          }}
        />
      ))}
    </div>
  )
}

function SkeletonList({
  count = 3,
  rowClassName = "h-16",
  className,
}: {
  count?: number
  rowClassName?: string
  className?: string
}) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn("rounded-lg", rowClassName)} />
      ))}
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonList }
