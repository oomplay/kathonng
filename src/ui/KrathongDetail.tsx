import type { KrathongRow } from '../types/db'
import { getStyle } from '../lib/styles'
import { formatThaiDate, formatThaiRelativeTime } from '../lib/time'
import { CheckIcon, CloseIcon, HeartIcon, KrathongIcon } from './icons'

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
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:bottom-4 sm:justify-start sm:p-5 lg:bottom-auto lg:left-4 lg:top-28 lg:justify-start">
      <article
        className="surface-glass pointer-events-auto w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl"
        aria-live="polite"
      >

        <div className="p-4">
          <div className="flex items-start gap-3">
            {krathong.photo_url ? (
              <img
                src={krathong.photo_url}
                alt={`รูปของ ${krathong.owner_name}`}
                className="size-12 shrink-0 rounded-2xl border border-hairline bg-river-900 object-cover shadow-lg"
                loading="lazy"
              />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-12 shrink-0 place-items-center rounded-2xl border border-hairline bg-gradient-to-br from-river-700 to-river-950 text-candle-300 shadow-inner"
              >
                <KrathongIcon className="size-6" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h2 className="truncate text-base font-semibold text-mist-50">
                  {krathong.owner_name}
                </h2>
                <span
                  className="chip"
                  style={{ backgroundColor: `${style.accent}22`, color: style.accent }}
                >
                  {style.label}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-mist-500">
                {formatThaiRelativeTime(krathong.created_at)} · {formatThaiDate(krathong.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="ปิดรายละเอียด"
              className="icon-button shrink-0"
            >
              <CloseIcon className="size-4" />
            </button>
          </div>

          <blockquote className="surface-sunken mt-3 rounded-2xl p-3 text-sm leading-relaxed text-mist-50">
            “{krathong.wish_text}”
          </blockquote>

          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onVote(krathong.id)}
              disabled={voted || voting}
              aria-pressed={voted}
              className={`control flex-1 ${
                voted
                  ? 'border border-jade-400/40 bg-jade-400/15 text-jade-300'
                  : 'control-primary'
              }`}
            >
              {voting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : voted ? (
                <>
                  <CheckIcon className="size-4" />
                  คุณโหวตแล้ว
                </>
              ) : (
                <>
                  <HeartIcon className="size-4" />
                  โหวตกระทงนี้
                </>
              )}
            </button>
            <div className="surface-sunken rounded-xl px-3 py-2 text-center">
              <div className="text-base font-semibold text-mist-50">
                {krathong.vote_count.toLocaleString('th-TH')}
              </div>
              <div className="text-[10px] text-mist-300">คะแนน</div>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
