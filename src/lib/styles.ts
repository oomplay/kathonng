import type { StyleId } from '../types/db'

export interface KrathongStyle {
  id: StyleId
  /** Thai display name shown in the UI. */
  label: string
  /** English name shown as a secondary label. */
  labelEn: string
  description: string
  /** Accent used for chips and focus rings. */
  accent: string
  /** Main body color of the float. */
  bodyColor: string
  /** Secondary color for petals / trim. */
  trimColor: string
  /** Emissive candle / halo color. */
  glowColor: string
  /** Number of decorative petals or ribs. */
  petals: number
  /** Overall scale multiplier in the 3D scene. */
  scale: number
}

export const STYLE_ORDER: StyleId[] = ['classic', 'lotus', 'golden', 'neon']

export const KRATHONG_STYLES: Record<StyleId, KrathongStyle> = {
  classic: {
    id: 'classic',
    label: 'คลาสสิก',
    labelEn: 'Classic',
    description: 'ลำลางใบตาลเรือนแบบดั้งเดิม อบอุ่นและเรียบง่าย',
    accent: '#7fd18a',
    bodyColor: '#3f7a46',
    trimColor: '#f3d27a',
    glowColor: '#ffb85c',
    petals: 8,
    scale: 1,
  },
  lotus: {
    id: 'lotus',
    label: 'บัวหลวง',
    labelEn: 'Lotus',
    description: 'กลีบบัวบานสีชมพู นุ่มนวลและมุ่งมั่น',
    accent: '#f45fa3',
    bodyColor: '#c23b78',
    trimColor: '#ffd0e6',
    glowColor: '#ff8fc7',
    petals: 10,
    scale: 1.04,
  },
  golden: {
    id: 'golden',
    label: 'ทองคำ',
    labelEn: 'Golden',
    description: 'ลายทองแผ่นดินเป็นเงิน หรูหราอย่างสง่างาม',
    accent: '#ffd76a',
    bodyColor: '#b9862a',
    trimColor: '#ffe9a8',
    glowColor: '#ffcf5c',
    petals: 6,
    scale: 1.08,
  },
  neon: {
    id: 'neon',
    label: 'นีออน',
    labelEn: 'Neon',
    description: 'เส้นแสงนีออนเรืองรอง สดใสและเป็นพิเศษ',
    accent: '#5ee7ff',
    bodyColor: '#1d3557',
    trimColor: '#8df3ff',
    glowColor: '#5ee7ff',
    petals: 5,
    scale: 1,
  },
}

export const COLOR_PRESETS: string[] = [
  '#ff8a3d',
  '#ffb85c',
  '#ffd76a',
  '#f45fa3',
  '#ff8fc7',
  '#5ee7ff',
  '#7fd18a',
  '#b58cff',
]

export function isStyleId(value: string): value is StyleId {
  return (STYLE_ORDER as string[]).includes(value)
}

/** Falls back to the classic style for unknown / malformed ids. */
export function getStyle(id: string): KrathongStyle {
  return isStyleId(id) ? KRATHONG_STYLES[id] : KRATHONG_STYLES.classic
}
