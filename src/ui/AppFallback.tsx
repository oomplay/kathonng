/**
 * Last-resort fallback for an error outside the 3D scene.
 *
 * Without this boundary any uncaught render error unmounts the whole React
 * tree and leaves an empty page behind. The fallback keeps the failure
 * visible and gives the user a way to retry without opening the console.
 */
export function AppFallback() {
  return (
    <main className="grid min-h-svh place-items-center bg-river-950 p-6 text-center">
      <div className="max-w-md rounded-3xl border border-ember-400/30 bg-white/5 p-8">
        <div className="mb-3 text-4xl" aria-hidden="true">
          🪔
        </div>
        <h1 className="text-xl font-semibold text-white">เกิดข้อผิดพลาดในการแสดงผล</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          กรุณาโหลดหน้าใหม่ หากยังพบปัญหา ให้ลองเปิดในเบราว์เซอร์เวอร์อื่นหรือล้างแคช
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="control control-primary mt-6"
        >
          โหลดหน้าใหม่
        </button>
      </div>
    </main>
  )
}
