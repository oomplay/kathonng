import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { CloseIcon } from './icons'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

/**
 * Accessible dialog built on the native `<dialog>` element.
 *
 * `showModal()` gives us the focus trap, the inert background and the Escape
 * key for free, and it keeps the dialog in the top layer so it is never
 * clipped by the 3D canvas. Focus returns to the trigger when the dialog
 * closes because the browser restores it when the dialog is closed.
 */
export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  wide = false,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        // Prevent the browser's default close so `onClose` stays the single
        // source of truth for the parent state.
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
      className={`surface-glass-strong m-0 max-h-[92svh] w-full overflow-y-auto rounded-t-3xl p-0 text-mist-50 shadow-2xl backdrop:bg-river-950/70 backdrop:backdrop-blur-sm open:flex open:flex-col sm:mx-auto sm:max-h-[88svh] sm:rounded-3xl ${
        wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
      }`}
    >
      <div className="flex items-start justify-between gap-4 border-b border-hairline px-5 py-4">
        <div>
          <h2 id={titleId} className="text-xl font-semibold text-mist-50">
            {title}
          </h2>
          {description && <p className="mt-1 text-sm text-mist-300">{description}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดหน้าต่าง"
          className="icon-button shrink-0"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

      {footer && (
        <div className="flex flex-wrap justify-end gap-2 border-t border-hairline px-5 py-4">
          {footer}
        </div>
      )}
    </dialog>
  )
}
