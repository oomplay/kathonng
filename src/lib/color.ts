/** Color helpers used by both the DOM UI and the 3D scene. */

export interface Rgb {
  r: number
  g: number
  b: number
}

/** Normalises `#abc` / `abc` / `#AABBCC` to a lowercase `#aabbcc`, or null. */
export function normalizeHex(input: string): string | null {
  const trimmed = input.trim().replace(/^#/, '')
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(trimmed)) return null
  const full = trimmed.length === 3
    ? trimmed.split('').map((char) => char + char).join('')
    : trimmed
  return `#${full.toLowerCase()}`
}

export function hexToRgb(hex: string): Rgb | null {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** Linear blend between two hex colors. `amount` is clamped to 0..1. */
export function mixHex(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  if (!a || !b) return from
  const t = Math.max(0, Math.min(1, amount))
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  )
}

/** Positive `amount` lightens toward white, negative darkens toward black. */
export function shade(hex: string, amount: number): string {
  const ratio = Math.max(-1, Math.min(1, amount))
  return ratio >= 0
    ? mixHex(hex, '#ffffff', ratio)
    : mixHex(hex, '#000000', -ratio)
}

/** Black or white text, whichever stays legible on the given background. */
export function readableTextOn(hex: string): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#ffffff'
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.6 ? '#0b1220' : '#ffffff'
}

/** `rgba(...)` string for the given hex color. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${Math.max(0, Math.min(1, alpha))})`
}
