import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

/**
 * Full-viewport modal portaled to document.body so fixed positioning
 * isn't clipped by page-level transform animations.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-2xl',
  headerExtra = null,
  header = null,
}) {
  useEffect(() => {
    if (!open) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[110]" role="presentation">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        <div className="flex min-h-full justify-center p-4 py-6 sm:items-center sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
            className={`relative my-auto flex w-full ${maxWidth} max-h-[calc(100vh-3rem)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl animate-fade-in-up`}
            onClick={(event) => event.stopPropagation()}
          >
            {header ? (
              <div className="shrink-0 border-b border-slate-200">{header}</div>
            ) : (
              title && (
                <div className="shrink-0 border-b border-slate-200">
                  <div className="flex items-center justify-between px-6 py-4">
                    <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                      {title}
                    </h2>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-95"
                      aria-label="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {headerExtra}
                </div>
              )
            )}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
              {children}
            </div>

            {footer && (
              <div className="shrink-0 border-t border-slate-200 px-6 py-4">{footer}</div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
