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
          className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-3 text-left text-sm shadow-lg backdrop-blur transition hover:brightness-110 ${
            toast.tone === 'success'
              ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100'
              : toast.tone === 'error'
                ? 'border-rose-400/40 bg-rose-500/15 text-rose-100'
                : 'border-sky-400/40 bg-sky-500/15 text-sky-100'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
