import { PinchIcon, ResetIcon, TapIcon } from './icons'

interface SceneHintsProps {
  /** True when the camera has been moved away from its home framing. */
  canReset: boolean
  onResetCamera: () => void
}

/**
 * The overlay that teaches the camera controls and offers a way back.
 *
 * The hint is written in Thai because that is the language of the rest of the
 * interface; the icons are universal so the meaning reads without reading.
 */
export function SceneHints({ canReset, onResetCamera }: SceneHintsProps) {
  return (
    <div className="pointer-events-none flex w-full flex-col items-center gap-2">
      <div className="pointer-events-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 sm:gap-3">
        <p className="surface-glass flex items-center gap-2 rounded-full px-3 py-2 text-xs text-mist-300 shadow-lg">
          <TapIcon className="size-4 shrink-0 text-candle-300" />
          <span>ลากเพื่อหมุนมอง</span>
          <span className="text-mist-500" aria-hidden="true">
            ·
          </span>
          <PinchIcon className="size-4 shrink-0 text-candle-300" />
          <span>ซูมเข้าออก</span>
        </p>

        <button
          type="button"
          onClick={onResetCamera}
          disabled={!canReset}
          className="surface-glass control pointer-events-auto min-h-11 rounded-full px-3 py-2 text-xs text-mist-300 shadow-lg enabled:hover:text-mist-50 disabled:opacity-40"
          title="กลับไปยังมุมมองเริ่มต้น"
        >
          <ResetIcon className="size-3.5" />
          <span>มุมมองเริ่มต้น</span>
        </button>
      </div>
    </div>
  )
}
