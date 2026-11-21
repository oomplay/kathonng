import { useEffect, useRef, useState } from 'react'
import { Modal } from './Modal'
import { CameraCapture } from './CameraCapture'
import { compressImageFile } from '../lib/camera'
import { COLOR_PRESETS, KRATHONG_STYLES, STYLE_ORDER } from '../lib/styles'
import { normalizeHex } from '../lib/color'
import type { StyleId } from '../types/db'
import { CameraIcon, ImageIcon } from './icons'

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

/** How the photo is currently being provided. */
type PhotoMode = 'camera' | 'file'

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
  const [photoMode, setPhotoMode] = useState<PhotoMode>('camera')
  const [processingPhoto, setProcessingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // The dialog is remounted by the parent (via `key`) each time it opens, so
  // the form always starts from a clean state without a reset effect.
  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const handlePhoto = async (file: File | null) => {
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

    setProcessingPhoto(true)
    try {
      // Every photo follows the same client-side path: centred square crop,
      // 640px longest edge, JPEG/WebP compression. The camera path already
      // produces this format, but running it again is cheap and keeps the
      // file-upload fallback from uploading a multi-megabyte original.
      const compressed = await compressImageFile(file)
      setPhoto(compressed)
      setPhotoPreview((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(compressed)
      })
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'ประมวลผลรูปภาพไม่สำเร็จ — กรุณาเลือกรูปใหม่',
      )
    } finally {
      setProcessingPhoto(false)
    }
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
            className="control control-ghost"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            form="create-krathong-form"
            disabled={submitting}
            className="control control-primary"
          >
            {submitting && (
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            {submitting ? 'กำลังส่ง…' : 'ส่งกระทงลงแม่น้ำ'}
          </button>
        </>
      }
    >
      <form id="create-krathong-form" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="owner-name" className="mb-1.5 block text-sm font-medium text-mist-50">
            ชื่อของคุณ
          </label>
          <input
            id="owner-name"
            type="text"
            value={ownerName}
            onChange={(event) => setOwnerName(event.target.value)}
            maxLength={60}
            placeholder="เช่น สมชาย"
            className="field"
          />
        </div>

        <div>
          <label htmlFor="wish-text" className="mb-1.5 block text-sm font-medium text-mist-50">
            คำอธิษฐาน
          </label>
          <textarea
            id="wish-text"
            value={wishText}
            onChange={(event) => setWishText(event.target.value)}
            maxLength={280}
            rows={3}
            placeholder="ขอให้ปีใหม่นี้สุขสันต์…"
            className="field resize-none"
          />
          <p className="mt-1 text-right text-[11px] text-mist-500">{wishText.length}/280</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-mist-50">รูปแบบกระทง</legend>
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
                      ? 'border-candle-400/70 bg-candle-400/10'
                      : 'border-hairline bg-candle-200/5 hover:border-hairline-strong'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="mb-2 block size-7 rounded-lg"
                    style={{
                      background: `linear-gradient(140deg, ${style.bodyColor}, ${style.trimColor})`,
                    }}
                  />
                  <span className="block text-sm font-medium text-mist-50">{style.label}</span>
                  <span className="block text-[11px] text-mist-300">{style.labelEn}</span>
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-mist-300">{KRATHONG_STYLES[styleId].description}</p>
        </fieldset>


        <fieldset>
          <legend className="mb-2 text-sm font-medium text-mist-50">สีของกระทง</legend>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setColorHex(preset)}
                aria-label={`เลือกสี ${preset}`}
                aria-pressed={colorHex.toLowerCase() === preset.toLowerCase()}
                className={`size-11 rounded-full border-2 transition ${
                  colorHex.toLowerCase() === preset.toLowerCase()
                    ? 'scale-110 border-mist-50'
                    : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: preset }}
              />
            ))}
            <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-hairline bg-candle-200/5 px-3 py-2 text-xs text-mist-300 transition hover:border-hairline-strong">
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
          <legend className="mb-2 text-sm font-medium text-mist-50">รูปภาพประกอบ (ไม่บังคับ)</legend>

          {photoPreview ? (
            <div className="relative overflow-hidden rounded-2xl border border-hairline">
              <img
                src={photoPreview}
                alt="ตัวอย่างรูปที่จะอัปโหลด"
                className="h-40 w-full bg-river-900 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearPhoto()
                    setPhotoMode('camera')
                  }}
                  className="control control-secondary rounded-full bg-river-950/80 px-3 py-2 text-xs backdrop-blur"
                >
                  <CameraIcon className="size-4" />
                  ถ่ายใหม่
                </button>
                <button
                  type="button"
                  onClick={clearPhoto}
                  className="control control-ghost rounded-full bg-river-950/80 px-3 py-2 text-xs backdrop-blur"
                >
                  ลบรูป
                </button>
              </div>
            </div>
          ) : processingPhoto ? (
            <div className="surface-sunken flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl text-sm text-mist-300">
              <span className="size-6 animate-spin rounded-full border-2 border-candle-300 border-t-transparent" />
              กำลังย่อและบีบอัดรูปภาพ…
            </div>
          ) : photoMode === 'camera' ? (
            <CameraCapture
              onCapture={handlePhoto}
              onUseFile={() => {
                setPhotoMode('file')
                fileInputRef.current?.click()
              }}
              onClose={() => setPhotoMode('file')}
            />
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="control control-secondary w-full py-6"
              >
                <ImageIcon className="size-5" />
                เลือกรูปภาพจากเครื่อง (ไม่เกิน 5 MB)
              </button>
              <button
                type="button"
                onClick={() => setPhotoMode('camera')}
                className="control control-ghost w-full"
              >
                <CameraIcon className="size-4" />
                กลับไปใช้กล้อง
              </button>
            </div>
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
          <p
            role="alert"
            className="rounded-xl border border-ember-400/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-300"
          >
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
