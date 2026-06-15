/** Configurable pulse skeleton placeholder. */
export default function Skeleton({ width, height, className = '' }) {
  const style = {}
  if (width) style.width = typeof width === 'number' ? `${width}px` : width
  if (height) style.height = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`animate-pulse rounded bg-slate-200 ${className}`}
      style={Object.keys(style).length ? style : undefined}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <Skeleton height={36} width="40%" />
          <Skeleton height={16} width="60%" />
        </div>
        <Skeleton className="h-11 w-11 shrink-0 rounded-lg" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} height={14} className="flex-1" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex gap-4 border-b border-slate-50 px-6 py-4">
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Skeleton height={24} width="70%" className="mb-3" />
          <Skeleton height={14} width="90%" className="mb-2" />
          <Skeleton height={14} width="60%" className="mb-5" />
          <Skeleton height={36} width="30%" className="mb-2" />
          <Skeleton height={14} width="40%" />
        </div>
      ))}
    </div>
  )
}
