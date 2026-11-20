/** Thai date helpers. */

const THAI_DATE_FORMAT = new Intl.DateTimeFormat('th-TH', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

/** "3 นาทีที่แล้ว" style relative time. */
export function formatThaiRelativeTime(iso: string, now: number = Date.now()): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return ''

  const diff = Math.max(0, now - timestamp)
  const seconds = Math.floor(diff / 1000)
  if (seconds < 45) return 'เมื่อสักครู่'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`

  const days = Math.floor(hours / 24)
  if (days === 1) return 'เมื่อวานนี้'
  if (days < 30) return `${days} วันที่แล้ว`

  return formatThaiDate(iso)
}

/** Absolute date, e.g. "20 พ.ย. 2026". */
export function formatThaiDate(iso: string): string {
  const timestamp = Date.parse(iso)
  if (Number.isNaN(timestamp)) return ''
  return THAI_DATE_FORMAT.format(new Date(timestamp))
}
