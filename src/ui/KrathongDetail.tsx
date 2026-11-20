import type { KrathongRow } from '../types/db'
import { getStyle } from '../lib/styles'
import { formatThaiDate, formatThaiRelativeTime } from '../lib/time'

interface KrathongDetailProps {
  krathong: KrathongRow | null
  voted: boolean
  voting: boolean
  onVote: (id: string) => void
  onClose: () => void
}

/** Floating card that shows the selected krathong in detail. */
export function KrathongDetail({
  krathong,
  voted,
  voting,
  onVote,
  onClose,
}: KrathongDetailProps) {
  if (!krathong) return null

  const style = getStyle(krathong.style_id)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:bottom-4 sm:justify-start sm:p-5 lg:bottom-auto lg:left-4 lg:top-24 lg:justify-start">
      <article
        className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-slate-950/85 shadow-2xl backdrop-blur-xl"
        aria-live="polite"
      >
        {krathong.photo_url && (
          <img
            src={krathong.photo_url}
            alt={`ภาพประกอบกระทงของ ${krathong.owner_name}`}
            className="h-40 w-full object-cover"
            loading="lazy"
          />
        )}

        <div className="p-4">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="size-11 shrink-0 rounded-2xl shadow-inner"
              style={{
                background: `linear-gradient(140deg, ${krathong.color_hex}, ${style.trimColor})`,
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="truncate text-base font-semibold text-white">
                  {krathong.owner_name}
                </h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: `${style.accent}22`, color: style.accent }}
                >
                  {style.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatThaiRelativeTime(krathong.created_at)} · {formatThaiDate(krathong.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดรายละเอียด"
              className="rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <blockquote className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-slate-100">
            “{krathong.wish_text}”
          </blockquote>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(krathong.id)}
              disabled={voted || voting}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:cursor-default ${
                voted
                  ? 'border border-emerald-400/40 bg-emerald-400/15 text-emerald-300'
                  : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/25 hover:brightness-110'
              }`}
            >
              {voting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : voted ? (
                '✓ คุณโหวตแล้ว'
              ) : (
                <>♥ โหวตกระทงนี้</>
              )}
            </button>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
              <div className="text-base font-semibold text-white">{krathong.vote_count}</div>
              <div className="text-[10px] text-slate-400">คะแนน</div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
