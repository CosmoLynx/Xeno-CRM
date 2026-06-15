/** Shared Recharts tooltip matching the app design system. */
export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg">
      {label && <p className="mb-1.5 font-medium text-slate-900">{label}</p>}
      <div className="space-y-1">
        {payload.map((entry) => {
          const [value, name] = formatter
            ? formatter(entry.value, entry.name, entry)
            : [entry.value, entry.name]

          return (
            <div key={entry.dataKey} className="flex items-center gap-2 text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span>
                {name}: <span className="font-medium text-slate-900">{value}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
