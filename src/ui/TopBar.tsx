import { EyeIcon, EyeOffIcon, KrathongIcon, ListIcon } from './icons'

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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 p-2 sm:p-5">
      {/* On phones the brand and actions share the first row and the stats get
          their own row, so the Thai labels stay readable instead of being
          squeezed to 9px. From `sm` up this is a plain flex row again. */}
      <div className="surface-glass pointer-events-auto mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-2xl p-2 shadow-xl sm:flex sm:flex-wrap sm:gap-3 sm:rounded-3xl sm:p-3">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-2 sm:gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-candle-300 to-candle-500 text-river-950 shadow-lg shadow-candle-500/25 sm:size-10 sm:rounded-xl">
            <KrathongIcon className="size-4 sm:size-6" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-sm leading-tight font-semibold text-mist-50 sm:text-base lg:text-lg">
              สารทนศีลมหาพระ
            </h1>
            <p className="hidden truncate text-xs text-mist-300 sm:block">
              ลอยกระทงพร้อมคำอธิษฐาน · ลุยแม่น้ำแห่งความหวัง
            </p>
          </div>
        </div>

        <dl className="col-span-2 row-start-2 grid grid-cols-3 gap-1 text-xs sm:ml-auto sm:flex sm:items-center sm:gap-3 sm:text-sm">
          <Stat label="กระทงในแม่น้ำ" value={total} />
          <Stat label="คะแนนโหวตรวม" value={totalVotes} />
          <Stat label="ที่คุณโหวต" value={myVotes} />
        </dl>

        <div className="col-start-2 row-start-1 flex items-center justify-self-end gap-1 sm:gap-1.5">
          <span
            className={`hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs sm:inline-flex ${
              isLive
                ? 'border-jade-400/40 bg-jade-400/10 text-jade-300'
                : 'border-candle-400/40 bg-candle-400/10 text-candle-300'
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
            className="icon-button"
          >
            {reducedEffects ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            <span className="sr-only">สลับการแสดงผลเอฟเฟกต์</span>
          </button>

          <button
            type="button"
            onClick={onToggleList}
            aria-expanded={listOpen}
            className="icon-button xl:hidden"
          >
            <ListIcon className="size-4" />
            <span className="sr-only">แสดงรายการกระทง</span>
          </button>

          <button type="button" onClick={onOpenCreate} className="control control-primary">
            <KrathongIcon className="size-4" />
            ลอยกระทง
          </button>
        </div>
      </div>
    </header>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-sunken rounded-lg px-1.5 py-1 text-center sm:rounded-xl sm:px-2.5 sm:py-1.5">
      <dt className="text-xs leading-tight text-mist-300">{label}</dt>
      <dd className="text-xs font-semibold text-mist-50 sm:text-base">
        {value.toLocaleString('th-TH')}
      </dd>
    </div>
  )
}
