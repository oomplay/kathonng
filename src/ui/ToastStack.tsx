import type { Toast } from '../types/ui'

interface ToastStackProps {
  toasts: Toast[]
  onDismiss: (id: number) => void
}

/** Transient notifications shown in the corner of the screen. */
export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={`surface-glass pointer-events-auto w-full max-w-sm rounded-2xl px-4 py-3 text-left text-sm shadow-lg transition hover:brightness-110 ${
            toast.tone === 'success'
              ? 'border-jade-400/40 bg-jade-400/12 text-jade-300'
              : toast.tone === 'error'
                ? 'border-ember-400/40 bg-ember-500/12 text-ember-300'
                : 'border-candle-400/40 bg-candle-400/12 text-candle-200'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
