import { useMemo, useState } from 'react'
import type { KrathongRow } from '../types/db'
import { getStyle } from '../lib/styles'
import { formatThaiRelativeTime } from '../lib/time'

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
      className={`pointer-events-auto absolute inset-x-0 bottom-0 z-40 flex max-h-[62svh] flex-col rounded-t-3xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:inset-y-0 lg:left-auto lg:right-4 lg:top-24 lg:max-h-none lg:w-[23rem] lg:rounded-3xl ${
        open ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'
      }`}
    >
      <div className="flex items-center gap-2 border-b border-white/10 p-3">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" fill="none" />
            <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ค้นหาชื่อหรือคำอธิษฐาน"
            aria-label="ค้นหากระทง"
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pr-3 pl-9 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดรายการ"
          className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
        >
          <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-slate-500">
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
            ? 'border-orange-400/60 bg-orange-400/10'
            : 'border-transparent hover:border-white/10 hover:bg-white/5'
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
              <span className="truncate text-sm font-medium text-white">{krathong.owner_name}</span>
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${style.accent}22`, color: style.accent }}
              >
                {style.label}
              </span>
            </span>
            <span className="mt-0.5 line-clamp-2 block text-xs leading-snug text-slate-300">
              {krathong.wish_text}
            </span>
            <span className="mt-1 block text-[11px] text-slate-500">
              {formatThaiRelativeTime(krathong.created_at)} · {krathong.vote_count} คะแนน
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => onVote(krathong.id)}
          disabled={voted || isVoting}
          aria-label={voted ? `คุณโหวตกระทงของ ${krathong.owner_name} แล้ว` : `โหวตกระทงของ ${krathong.owner_name}`}
          className={`my-auto grid size-9 shrink-0 place-items-center rounded-xl border text-sm transition active:scale-95 ${
            voted
              ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
              : 'border-white/10 bg-white/5 text-slate-300 hover:border-rose-400/50 hover:bg-rose-500/15 hover:text-rose-200'
          } disabled:cursor-default`}
        >
          {isVoting ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : voted ? (
            '✓'
          ) : (
            '♥'
          )}
        </button>
      </div>
    </li>
  )
}
