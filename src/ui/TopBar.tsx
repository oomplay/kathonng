interface TopBarProps {
  total: number
  totalVotes: number
  myVotes: number
  isLive: boolean
  reducedEffects: boolean
  onToggleEffects: () => void
  onOpenCreate: () => void
  onToggleList: () => void
  listOpen: boolean
}

/** Header with live stats and the primary "ลอยกระทง" action. */
export function TopBar({
  total,
  totalVotes,
  myVotes,
  isLive,
  reducedEffects,
  onToggleEffects,
  onOpenCreate,
  onToggleList,
  listOpen,
}: TopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 sm:p-5">
      <div className="pointer-events-auto mx-auto flex max-w-6xl flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 p-3 shadow-xl backdrop-blur-xl sm:rounded-full">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-lg shadow-lg shadow-orange-500/30">
            🪔
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold leading-tight text-white sm:text-lg">
              สารทนศีลมหาพระ
            </h1>
            <p className="truncate text-xs text-slate-400">
              ลอยกระทงพร้อมคำอธิษฐาน · ลุยแม่น้ำแห่งความหวัง
            </p>
          </div>
        </div>

        <dl className="ml-auto flex items-center gap-1.5 text-xs sm:gap-3 sm:text-sm">
          <Stat label="กระทง" value={total} />
          <Stat label="คำอธิษฐาน" value={totalVotes} />
          <Stat label="ที่คุณโหวต" value={myVotes} />
        </dl>

        <div className="flex items-center gap-1.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex ${
              isLive
                ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
            }`}
            title={isLive ? 'เชื่อมต่อข้อมูลแบบเรียลไทม์แล้ว' : 'กำลังเชื่อมต่อข้อมูลเรียลไทม์'}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {isLive ? 'เรียลไทม์' : 'กำลังเชื่อมต่อ'}
          </span>

          <button
            type="button"
            onClick={onToggleEffects}
            aria-pressed={reducedEffects}
            title={reducedEffects ? 'เปิดเอฟเฟกต์' : 'ลดเอฟเฟกต์'}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            {reducedEffects ? (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.2A9 9 0 0112 5c5 0 9 4.5 9 10a8.7 8.7 0 01-2.1 5.6M6.2 6.2A8.9 8.9 0 003 15c0 2 .6 3.9 1.6 5.4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
                <path
                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill="none"
                />
                <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" fill="none" />
              </svg>
            )}
            <span className="sr-only">สลับการแสดงผลเอฟเฟกต์</span>
          </button>

          <button
            type="button"
            onClick={onToggleList}
            aria-expanded={listOpen}
            className="rounded-full border border-white/10 p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <span className="sr-only">แสดงรายการกระทง</span>
          </button>

          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500 to-rose-500 px-3.5 py-2 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 active:scale-[0.98]"
          >
            <span aria-hidden="true">🪔</span>
            ลอยกระทง
          </button>
        </div>
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-center">
      <dt className="text-[10px] leading-tight text-slate-400 sm:text-xs">{label}</dt>
      <dd className="text-sm font-semibold text-white sm:text-base">{value.toLocaleString('th-TH')}</dd>
    </div>
  )
}
