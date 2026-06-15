import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import useCountUp from '../hooks/useCountUp'

const ICON_COLOR_MAP = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
}

/**
 * Reusable KPI stat card for dashboard metrics.
 */
export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection,
  iconColor = 'indigo',
  suffix = '',
  animate = true,
  className = '',
}) {
  const colors = ICON_COLOR_MAP[iconColor] || ICON_COLOR_MAP.indigo
  const numericValue = typeof value === 'number' ? value : null
  const counted = useCountUp(animate && numericValue !== null ? numericValue : 0)

  const displayValue =
    numericValue !== null && animate
      ? `${counted.toLocaleString('en-IN')}${suffix}`
      : `${value}${suffix}`

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold text-slate-900">{displayValue}</p>
          <p className="mt-1 text-sm text-slate-500">{title}</p>
        </div>
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-lg ${colors.bg}`}
        >
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
      </div>

      {trend && (
        <div className="mt-4">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              trendDirection === 'up' && 'bg-emerald-50 text-emerald-700',
              trendDirection === 'down' && 'bg-red-50 text-red-700',
              !trendDirection && 'bg-slate-100 text-slate-600',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {trendDirection === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {trendDirection === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {trend}
          </span>
        </div>
      )}
    </div>
  )
}
