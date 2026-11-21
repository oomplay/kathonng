import { KrathongIcon } from './icons'

/**
 * Loading screen shown while the 3D scene chunk is on the wire.
 *
 * The HUD is already painted when this appears, so it has to look like part
 * of the riverside rather than a browser spinner: a lantern glow over the
 * night palette with a short Thai status line.
 */
export function SceneLoader() {
  return (
    <div
      className="absolute inset-0 grid place-items-center bg-river-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4 px-6 text-center">
        <span className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-pulse rounded-full bg-candle-400/20 blur-xl" />
          <span className="relative grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-candle-300 to-candle-500 text-river-950 shadow-lg shadow-candle-500/30">
            <KrathongIcon className="size-6" />
          </span>
        </span>

        <div>
          <p className="text-sm font-medium text-mist-50">กำลังเตรียมแม่น้ำ…</p>
          <p className="mt-1 text-xs text-mist-400">
            กำลังโหลดฉาก 3 มิติ — รอสักครู่
          </p>
        </div>
      </div>
    </div>
  )
}

/** Placeholder shown while the create dialog chunk is being fetched. */
export function DialogLoader() {
  return (
    <div
      className="surface-glass pointer-events-auto fixed inset-x-4 bottom-6 mx-auto flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm text-mist-200 shadow-xl sm:inset-x-auto"
      role="status"
      aria-live="polite"
    >
      <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-candle-300 border-t-transparent" />
      กำลังเปิดหน้าต่างลอยกระทง…
    </div>
  )
}
