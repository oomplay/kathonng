/**
 * Live camera capture for the "ลอยกระทง" selfie.
 *
 * The module owns the whole `getUserMedia` lifecycle so components never have
 * to think about tracks: every stream is stopped when the caller releases it,
 * when the tab is hidden, or when an error occurs. Captures are cropped to a
 * centred square and downscaled so a photo never gets close to the 5 MB
 * upload limit.
 */

/** Longest edge of the encoded image, in pixels. */
export const CAPTURE_SIZE = 640

/** JPEG quality used for the upload. */
export const CAPTURE_QUALITY = 0.82

export type FacingMode = 'user' | 'environment'

export type CameraErrorKind = 'denied' | 'unavailable' | 'insecure' | 'unknown'

/** A camera failure with a Thai message that is safe to show to the user. */
export class CameraError extends Error {
  readonly kind: CameraErrorKind

  constructor(kind: CameraErrorKind, message: string) {
    super(message)
    this.name = 'CameraError'
    this.kind = kind
  }
}

/** True when the browser can expose a camera at all. */
export function isCameraSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  )
}

function toCameraError(cause: unknown): CameraError {
  const name = cause instanceof DOMException ? cause.name : ''

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return new CameraError(
      'denied',
      'ไม่ได้รับสิทธิ์ใช้กล้อง — กรุณากดไอคอนกล้องในแถบเบราว์เซอร์แล้วลองใหม่ หรือเลือกอัปโหลดรูปจากเครื่องแทน',
    )
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') {
    return new CameraError(
      'unavailable',
      'ไม่พบกล้องที่ใช้งานได้ในเครื่องนี้ — เลือกอัปโหลดรูปจากเครื่องแทนได้',
    )
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new CameraError(
      'unavailable',
      'กล้องถูกใช้งานอยู่โดยโปรแกรมอื่น — ปิดโปรแกรมที่กำลังใช้กล้องแล้วลองใหม่',
    )
  }
  return new CameraError('unknown', 'เปิดกล้องไม่สำเร็จ — เลือกอัปโหลดรูปจากเครื่องแทนได้')
}

/**
 * Opens the camera and returns a live stream.
 *
 * The stream is requested with a modest ideal resolution: a 1080p sensor
 * costs bandwidth and heat for no visible gain once the frame is cropped to
 * {@link CAPTURE_SIZE}.
 */
export async function startCamera(facingMode: FacingMode): Promise<MediaStream> {
  if (!isCameraSupported()) {
    throw new CameraError(
      'unavailable',
      'เบราว์เซอร์นี้ไม่รองรับการใช้กล้อง — เลือกอัปโหลดรูปจากเครื่องแทนได้',
    )
  }

  // `getUserMedia` is only exposed in a secure context; on plain http the
  // API is simply missing, so report it as unsupported rather than failing
  // with an opaque error.
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    throw new CameraError(
      'insecure',
      'การใช้กล้องต้องเปิดผ่าน https หรือ localhost — เลือกอัปโหลดรูปจากเครื่องแทนได้',
    )
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 1280 },
      },
      audio: false,
    })
  } catch (cause) {
    throw toCameraError(cause)
  }
}

/** Stops every track of a stream. Safe to call more than once. */
export function stopCamera(stream: MediaStream | null | undefined): void {
  if (!stream) return
  for (const track of stream.getTracks()) {
    try {
      track.stop()
    } catch {
      // A track that is already ended cannot be stopped again; ignore it.
    }
  }
}

/** Flips a live stream between the front and rear camera. */
export function flipCamera(current: MediaStream): FacingMode {
  const track = current.getVideoTracks()[0]
  const settings = track?.getSettings?.()
  return settings?.facingMode === 'environment' ? 'user' : 'environment'
}

/**
 * Crops the current video frame to a centred square, downscales it and
 * encodes it as a JPEG blob.
 *
 * @param video    the element the live stream is attached to
 * @param mirror   flip horizontally, so a selfie matches what the user sees
 */
export async function captureSquareFrame(
  video: HTMLVideoElement,
  options: { mirror?: boolean; size?: number; quality?: number } = {},
): Promise<Blob> {
  const size = options.size ?? CAPTURE_SIZE
  const quality = options.quality ?? CAPTURE_QUALITY

  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!sourceWidth || !sourceHeight) {
    throw new CameraError('unknown', 'ยังไม่ได้รับภาพจากกล้อง — ลองอีกครั้ง')
  }

  // Centre square of the source frame.
  const edge = Math.min(sourceWidth, sourceHeight)
  const sx = (sourceWidth - edge) / 2
  const sy = (sourceHeight - edge) / 2

  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')
  if (!context) {
    throw new CameraError('unknown', 'เบราว์เซอร์ไม่รองรับการประมวลผลภาพ — เลือกอัปโหลดรูปแทนได้')
  }

  if (options.mirror) {
    context.translate(size, 0)
    context.scale(-1, 1)
  }

  context.drawImage(video, sx, sy, edge, edge, 0, 0, size, size)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', quality)
  })
  canvas.width = 0
  canvas.height = 0

  if (!blob) {
    throw new CameraError('unknown', 'บันทึกภาพไม่สำเร็จ — ลองถ่ายใหม่อีกครั้ง')
  }
  return blob
}

/** Wraps a captured blob in a `File` the upload path already understands. */
export function blobToFile(blob: Blob, name = 'krathong-selfie.jpg'): File {
  return new File([blob], name, { type: blob.type || 'image/jpeg' })
}

/** True when the browser can encode WebP. */
function supportsWebP(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

/** A decoded image plus the way to release it. */
interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

/**
 * Decodes an image file for canvas drawing.
 *
 * `createImageBitmap` is preferred because it applies the EXIF orientation of
 * the photo, so a portrait selfie is not drawn sideways. Browsers without it
 * fall back to an `<img>` element.
 */
async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Some browsers reject the options bag; retry with the plain call.
      try {
        const bitmap = await createImageBitmap(file)
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        }
      } catch {
        // Fall through to the <img> path below.
      }
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () =>
        reject(new CameraError('unknown', 'อ่านไฟล์รูปไม่สำเร็จ — กรุณาเลือกรูปใหม่'))
      element.src = url
    })
    return {
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      release: () => URL.revokeObjectURL(url),
    }
  } catch (cause) {
    URL.revokeObjectURL(url)
    throw cause
  }
}

/**
 * Crops an image file to a centred square, downscales it and re-encodes it.
 *
 * This is the path used for photos picked from the device: a modern phone
 * camera produces multi-megabyte images, and uploading those verbatim would
 * waste bandwidth and blow the storage budget. The result is at most
 * {@link CAPTURE_SIZE} pixels on a side.
 */
export async function compressImageFile(
  file: File,
  options: { size?: number; quality?: number } = {},
): Promise<File> {
  const size = options.size ?? CAPTURE_SIZE
  const quality = options.quality ?? CAPTURE_QUALITY

  const image = await decodeImage(file)
  try {
    if (!image.width || !image.height) {
      throw new CameraError('unknown', 'อ่านไฟล์รูปไม่สำเร็จ — กรุณาเลือกรูปใหม่')
    }

    const edge = Math.min(image.width, image.height)
    const sx = (image.width - edge) / 2
    const sy = (image.height - edge) / 2

    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size

    const context = canvas.getContext('2d')
    if (!context) {
      throw new CameraError(
        'unknown',
        'เบราว์เซอร์ไม่รองรับการประมวลผลภาพ — เลือกอัปโหลดรูปแทนได้',
      )
    }

    context.drawImage(image.source, sx, sy, edge, edge, 0, 0, size, size)

    const type = supportsWebP() ? 'image/webp' : 'image/jpeg'
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, type, quality)
    })
    canvas.width = 0
    canvas.height = 0

    if (!blob) {
      throw new CameraError('unknown', 'บันทึกภาพไม่สำเร็จ — กรุณาเลือกรูปใหม่')
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'krathong-photo'
    return new File([blob], `${baseName}.${type === 'image/webp' ? 'webp' : 'jpg'}`, {
      type,
    })
  } finally {
    image.release()
  }
}