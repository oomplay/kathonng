import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { COLOR_PRESETS, KRATHONG_STYLES, STYLE_ORDER } from '../lib/styles'
import { normalizeHex } from '../lib/color'
import type { StyleId } from '../types/db'

export interface CreateKrathongValues {
  ownerName: string
  wishText: string
  styleId: StyleId
  colorHex: string
  photo: File | null
}

interface CreateKrathongDialogProps {
  open: boolean
  submitting: boolean
  onClose: () => void
  onSubmit: (values: CreateKrathongValues) => void
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

/** Form used to float a new krathong. */
export function CreateKrathongDialog({
  open,
  submitting,
  onClose,
  onSubmit,
}: CreateKrathongDialogProps) {
  const [ownerName, setOwnerName] = useState('')
  const [wishText, setWishText] = useState('')
  const [styleId, setStyleId] = useState<StyleId>('classic')
  const [colorHex, setColorHex] = useState(COLOR_PRESETS[0])
  const [photo, setPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The dialog is remounted by the parent (via `key`) each time it opens, so
  // the form always starts from a clean state without a reset effect.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handlePhoto = (file: File | null) => {
    setError(null)
    if (!file) {
      clearPhoto()
      return
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('รองรับเฉพาะไฟล์ PNG, JPEG, WEBP และ AVIF')
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError('รูปภาพต้องมีขนาดไม่เกิน 5 MB')
      return
    }
    setPhoto(file)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  const clearPhoto = () => {
    setPhoto(null)
    setPhotoPreview((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = ownerName.trim()
    const trimmedWish = wishText.trim()

    if (!trimmedName) {
      setError('กรุณาใส่ชื่อของคุณ')
      return
    }
    if (!trimmedWish) {
      setError('กรุณาเขียนคำอธิษฐาน')
      return
    }
    if (trimmedName.length > 60) {
      setError('ชื่อยาวเกินไป (ไม่เกิน 60 ตัวอักษร)')
      return
    }
    if (trimmedWish.length > 280) {
      setError('คำอธิษฐานยาวเกินไป (ไม่เกิน 280 ตัวอักษร)')
      return
    }

    setError(null)
    onSubmit({
      ownerName: trimmedName,
      wishText: trimmedWish,
      styleId,
      colorHex: normalizeHex(colorHex) ?? COLOR_PRESETS[0],
      photo,
    })
  }


  return (
    <Modal
      open={open}
      onClose={onClose}
      title="ลอยกระทงของคุณ"
      description="เขียนคำอธิษฐานลงบนกระทง แล้วส่งมันลงแม่น้ำ"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="create-krathong-form"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && (
              <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {submitting ? 'กำลังส่ง…' : 'ส่งกระทงลงแม่น้ำ'}
          </button>
        </>
      }
    >
      <form id="create-krathong-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="owner-name" className="mb-1.5 block text-sm font-medium text-slate-200">
            ชื่อของคุณ
          </label>
          <input
            id="owner-name"
            type="text"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            maxLength={60}
            placeholder="เช่น สมชาย"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="wish-text" className="mb-1.5 block text-sm font-medium text-slate-200">
            คำอธิษฐาน
          </label>
          <textarea
            id="wish-text"
            value={wishText}
            onChange={(event) => setWishText(event.target.value)}
            maxLength={280}
            rows={3}
            placeholder="ขอให้ปีใหม่นี้สุขสันต์…"
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-orange-400/60 focus:ring-2 focus:ring-orange-400/20 focus:outline-none"
          />
          <p className="mt-1 text-right text-[11px] text-slate-500">{wishText.length}/280</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-200">รูปแบบกระทง</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STYLE_ORDER.map((id) => {
              const style = KRATHONG_STYLES[id]
              const active = styleId === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStyleId(id)}
                  aria-pressed={active}
                  className={`rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-orange-400/70 bg-orange-400/10'
                      : 'border-white/10 bg-white/5 hover:border-white/25'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 block size-7 rounded-lg"
                    style={{
                      background: `linear-gradient(140deg, ${style.bodyColor}, ${style.trimColor})`,
                    }}
                  />
                  <span className="block text-sm font-medium text-white">{style.label}</span>
                  <span className="block text-[11px] text-slate-400">{style.labelEn}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">{KRATHONG_STYLES[styleId].description}</p>
        </fieldset>


        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-200">สีของกระทง</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColorHex(preset)}
                aria-label={`เลือกสี ${preset}`}
                aria-pressed={colorHex.toLowerCase() === preset.toLowerCase()}
                className={`size-8 rounded-full border-2 transition ${
                  colorHex.toLowerCase() === preset.toLowerCase()
                    ? 'scale-110 border-white'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-white/25">
              <input
                type="color"
                value={normalizeHex(colorHex) ?? COLOR_PRESETS[0]}
                onChange={(event) => setColorHex(event.target.value)}
                className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                aria-label="เลือกสีกำหนดเอง"
              />
              สีกำหนดเอง
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-200">รูปภาพประกอบ (ไม่บังคับ)</legend>
          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-white/10">
              <img src={photoPreview} alt="ตัวอย่างรูปที่จะอัปโหลด" className="h-40 w-full object-cover" />
              <button
                type="button"
                onClick={clearPhoto}
                className="absolute top-2 right-2 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs text-white transition hover:bg-slate-950"
              >
                ลบรูป
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-slate-300 transition hover:border-orange-400/50 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path
                  d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              </svg>
              เลือกรูปภาพ (ไม่เกิน 5 MB)
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/avif"
            className="hidden"
            onChange={(event) => handlePhoto(event.target.files?.[0] ?? null)}
          />
        </fieldset>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
