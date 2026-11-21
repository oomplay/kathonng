import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CameraError,
  blobToFile,
  captureSquareFrame,
  flipCamera,
  startCamera,
  stopCamera,
  type FacingMode,
} from '../lib/camera'
import { CameraIcon, CloseIcon, FlipIcon, ImageIcon, UploadIcon } from './icons'

interface CameraCaptureProps {
  /** Called with the captured photo. */
  onCapture: (file: File) => void
  /** Called when the user asks to pick a file instead of using the camera. */
  onUseFile: () => void
  /** Called when the user closes the camera view. */
  onClose: () => void
}

type CameraState = 'starting' | 'live' | 'error'

/** The outcome of one camera attempt. */
interface CameraResult {
  attempt: number
  facing: FacingMode
  state: CameraState
  error: string | null
}

/**
 * Live selfie capture.
 *
 * The preview is mirrored for the front camera so the user sees themselves the
 * way a mirror would show them, and the shutter button is at least 64px so it
 * is comfortable to hit on a phone.
 */
export function CameraCapture({ onCapture, onUseFile, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // What we are asking the camera for. Bumping `attempt` retries the request.
  const [request, setRequest] = useState({ attempt: 0, facing: 'user' as FacingMode })
  // What the camera answered. Null until the first attempt settles.
  const [result, setResult] = useState<CameraResult | null>(null)
  const [capturing, setCapturing] = useState(false)

  const releaseStream = useCallback(() => {
    stopCamera(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  // Open the camera. The effect owns the stream, so switching cameras or
  // unmounting always releases the previous one.
  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const stream = await startCamera(request.facing)
        if (cancelled) {
          stopCamera(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }
        if (cancelled) return
        setResult({
          attempt: request.attempt,
          facing: request.facing,
          state: 'live',
          error: null,
        })
      } catch (cause) {
        if (cancelled) return
        releaseStream()
        setResult({
          attempt: request.attempt,
          facing: request.facing,
          state: 'error',
          error:
            cause instanceof CameraError
              ? cause.message
              : 'เปิดกล้องไม่สำเร็จ — เลือกอัปโหลดรูปจากเครื่องแทนได้',
        })
      }
    })()

    return () => {
      cancelled = true
      releaseStream()
    }
  }, [request, releaseStream])

  // A backgrounded tab keeps the camera shutter open unless we close it.
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') releaseStream()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [releaseStream])

  // While a new request is in flight the previous result does not apply.
  const current =
    result && result.attempt === request.attempt && result.facing === request.facing
      ? result
      : { attempt: request.attempt, facing: request.facing, state: 'starting' as const, error: null }

  const handleCapture = useCallback(async () => {
    const video = videoRef.current
    if (!video || capturing) return
    setCapturing(true)
    try {
      const blob = await captureSquareFrame(video, { mirror: request.facing === 'user' })
      // A confirmed capture closes the shutter immediately. The parent will
      // show the still image and offer a retake, which starts a fresh stream.
      releaseStream()
      onCapture(blobToFile(blob))
    } catch (cause) {
      // A capture error must not leave the camera indicator on.
      releaseStream()
      setResult({
        attempt: request.attempt,
        facing: request.facing,
        state: 'error',
        error:
          cause instanceof CameraError ? cause.message : 'ถ่ายรูปไม่สำเร็จ — ลองอีกครั้ง',
      })
    } finally {
      setCapturing(false)
    }
  }, [capturing, onCapture, releaseStream, request.attempt, request.facing])

  const handleFlip = useCallback(() => {
    const stream = streamRef.current
    if (!stream) return
    setRequest((current) => ({ ...current, facing: flipCamera(stream) }))
  }, [])

  /** Retries the camera after a failure. */
  const handleRetry = useCallback(() => {
    setRequest((current) => ({ ...current, attempt: current.attempt + 1 }))
  }, [])

  if (current.state === 'error') {
    return (
      <div className="surface-sunken flex flex-col items-center gap-3 rounded-2xl px-4 py-6 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-candle-400/15 text-candle-300">
          <CameraIcon className="size-5" />
        </span>
        <p role="alert" className="text-sm leading-relaxed text-mist-300">
          {current.error}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" onClick={onUseFile} className="control control-secondary">
            <UploadIcon className="size-4" />
            เลือกรูปจากเครื่อง
          </button>
          <button type="button" onClick={handleRetry} className="control control-ghost">
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }


  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-mist-50">ถ่ายรูปตัวเอง</h3>
        <span className="text-xs text-mist-500">
          {request.facing === 'user' ? 'กล้องหน้า' : 'กล้องหลัง'}
        </span>
      </div>
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-river-950">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="ภาพตัวอย่างจากกล้อง"
          className={`size-full object-cover ${request.facing === 'user' ? '-scale-x-100' : ''}`}
        />

        {/* Framing guide: the crop is a centred square, so the guide matches
            exactly what the stored photo will contain. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-candle-200/25"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[8%] rounded-full border border-dashed border-candle-200/45"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="ปิดกล้อง"
          className="icon-button absolute top-2 right-2 bg-river-950/70 backdrop-blur"
        >
          <CloseIcon className="size-4" />
        </button>

        <button
          type="button"
          onClick={handleFlip}
          aria-label="สลับกล้องหน้าและกล้องหลัง"
          className="icon-button absolute top-2 left-2 bg-river-950/70 backdrop-blur"
        >
          <FlipIcon className="size-4" />
        </button>

        {current.state === 'starting' && (
          <div className="absolute inset-0 grid place-items-center bg-river-950/60">
            <span className="size-6 animate-spin rounded-full border-2 border-candle-300 border-t-transparent" />
            <span className="sr-only">กำลังเปิดกล้อง</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onUseFile} className="control control-ghost px-2">
          <ImageIcon className="size-4" />
          <span className="hidden sm:inline">เลือกจากเครื่อง</span>
        </button>

        <button
          type="button"
          onClick={handleCapture}
          disabled={current.state !== 'live' || capturing}
          aria-label="ถ่ายรูป"
          className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-candle-200/80 bg-candle-300 text-river-950 transition enabled:hover:bg-candle-200 enabled:active:scale-95 disabled:opacity-50"
        >
          {capturing ? (
            <span className="size-5 animate-spin rounded-full border-2 border-river-950 border-t-transparent" />
          ) : (
            <CameraIcon className="size-6" />
          )}
        </button>

        <span className="w-24 text-right text-[11px] leading-tight text-mist-500">
          ถ่ายเป็นสี่เหลี่ยมจัตุรัส
        </span>
      </div>
    </div>
  )
}
