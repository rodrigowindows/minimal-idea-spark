import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex gap-4">
        <Skeleton className="h-24 flex-1 rounded-xl" />
        <Skeleton className="h-24 flex-1 rounded-xl" />
        <Skeleton className="h-24 flex-1 rounded-xl" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

export function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  )
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border p-4', className)}>
      <Skeleton className="mb-2 h-5 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  )
}
