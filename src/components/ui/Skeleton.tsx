"use client"

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-white/[0.05] ${className}`} />
  )
}

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse h-3 rounded-md bg-white/[0.05] ${className}`} />
  )
}

export function SkeletonCircle({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-full bg-white/[0.05] ${className}`} />
  )
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 ${className}`}>
      <div className="space-y-3">
        <SkeletonLine className="w-1/3 bg-white/[0.06]" />
        <Skeleton className="h-7 w-1/2 bg-white/[0.05]" />
        <SkeletonLine className="w-2/3 bg-white/[0.04]" />
      </div>
    </div>
  )
}
