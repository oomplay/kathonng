import { useMemo, useState } from 'react'
import type { KrathongRow } from '../types/db'
import { getStyle } from '../lib/styles'
import { formatThaiRelativeTime } from '../lib/time'
import { CloseIcon, HeartIcon, SearchIcon } from './icons'

interface KrathongListProps {
  krathongs: KrathongRow[]
  votedIds: Set<string>
  selectedId: string | null
  onSelect: (id: string) => void
  onVote: (id: string) => void
  votingId: string | null
  open: boolean
  onClose: () => void
}

/** Scrollable list of every krathong, with search and inline voting. */
export function KrathongList({
  krathongs,
  votedIds,
  selectedId,
  onSelect,
  onVote,
  votingId,
  open,
  onClose,
}: KrathongListProps) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return krathongs
    return krathongs.filter((item) =>
      `${item.owner_name} ${item.wish_text}`.toLowerCase().includes(needle),
    )
  }, [krathongs, query])

  return (
    <aside
      data-open={open}
      className={`surface-glass krathong-list-panel pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex max-h-[62svh] flex-col rounded-t-3xl shadow-2xl transition-transform duration-300 xl:inset-y-0 xl:left-auto xl:right-4 xl:top-28 xl:max-h-none xl:w-[23rem] xl:rounded-3xl`}
    >
      <div className="flex items-center gap-2 border-b border-hairline p-3">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist-500" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อหรือคำอธิษฐาน"
            aria-label="ค้นหากระทง"
            className="field py-2 pr-3 pl-9"
          />
        </div>
        <button
          className="icon-button xl:hidden"
          type="button"
          onClick={onClose}
          aria-label="ปิดรายการ"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-mist-500">
            {query ? 'ไม่พบกระทงที่ตรงกับคำค้น' : 'ยังไม่มีกระทงในแม่น้ำ'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((krathong) => (
              <KrathongRowItem
                key={krathong.id}
                krathong={krathong}
                voted={votedIds.has(krathong.id)}
                isSelected={krathong.id === selectedId}
                isVoting={votingId === krathong.id}
                onSelect={onSelect}
                onVote={onVote}
              />
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}


interface RowItemProps {
  krathong: KrathongRow
  voted: boolean
  isSelected: boolean
  isVoting: boolean
  onSelect: (id: string) => void
  onVote: (id: string) => void
}

function KrathongRowItem({
  krathong,
  voted,
  isSelected,
  isVoting,
  onSelect,
  onVote,
}: RowItemProps) {
  const style = getStyle(krathong.style_id)

  return (
    <li>
      <div
        className={`flex gap-2 rounded-2xl border p-2.5 transition ${
          isSelected
            ? 'border-candle-400/60 bg-candle-400/10'
            : 'border-transparent hover:border-hairline hover:bg-candle-200/5'
        }`}
      >
        <button
          type="button"
          onClick={() => onSelect(krathong.id)}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
        >
          <span
            aria-hidden="true"
            className="mt-0.5 size-9 shrink-0 rounded-xl shadow-inner"
            style={{
              background: `linear-gradient(140deg, ${krathong.color_hex}, ${style.trimColor})`,
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-mist-50">{krathong.owner_name}</span>
              <span
                className="chip shrink-0"
                style={{ backgroundColor: `${style.accent}22`, color: style.accent }}
              >
                {style.label}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-mist-300">
              {krathong.wish_text}
            </span>
            <span className="mt-1 block text-[11px] text-mist-500">
              {formatThaiRelativeTime(krathong.created_at)} · {krathong.vote_count} คะแนน
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onVote(krathong.id)}
          disabled={voted || isVoting}
          aria-label={voted ? `คุณโหวตกระทงของ ${krathong.owner_name} แล้ว` : `โหวตกระทงของ ${krathong.owner_name}`}
          aria-pressed={voted}
          className={`my-auto grid size-11 shrink-0 place-items-center rounded-xl border transition active:scale-95 ${
            voted
              ? 'border-jade-400/40 bg-jade-400/15 text-jade-300'
              : 'border-hairline bg-candle-200/5 text-mist-300 hover:border-lotus-400/50 hover:bg-lotus-400/15 hover:text-lotus-300'
          } disabled:cursor-default`}
        >
          {isVoting ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <HeartIcon filled={voted} className="size-4" />
          )}
        </button>
      </div>
    </li>
  )
}
