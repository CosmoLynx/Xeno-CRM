import { useEffect } from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'

const STYLES = {
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle2,
    iconColor: 'text-emerald-500',
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-800',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
}

export default function Toast({ id, message, type = 'success', onDismiss }) {
  const config = STYLES[type] || STYLES.success
  const Icon = config.icon

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div
      role="alert"
      className={`flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg animate-fade-in-up ${config.container}`}
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${config.iconColor}`} />
      <p className="flex-1 leading-snug">{message}</p>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
