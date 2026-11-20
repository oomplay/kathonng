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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3 sm:p-5">
      <div className="pointer-events-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 sm:gap-3">
        <p className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 shadow-lg backdrop-blur-xl">
          <span className="text-base leading-none" aria-hidden="true">
            👆
          </span>
          <span>ลากเพื่อหมุนมอง</span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span className="text-base leading-none" aria-hidden="true">
            🤏
          </span>
          <span>ซูมเข้าออก</span>
        </p>

        <button
          type="button"
          onClick={onResetCamera}
          disabled={!canReset}
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1.5 text-xs text-slate-300 shadow-lg backdrop-blur-xl transition enabled:hover:bg-white/10 enabled:hover:text-white disabled:opacity-40"
          title="กลับไปยังมุมมองเริ่มต้น"
        >
          <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
            <path
              d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006 5.3M4 15a8 8 0 0014 3.7"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span>มุมมองเริ่มต้น</span>
        </button>
      </div>
    </div>
  )
}
