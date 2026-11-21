import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/**
 * Every icon in the app is drawn on the same 24px grid with the same stroke
 * weight, so the HUD reads as one set instead of a mix of emoji and SVGs.
 */
function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** A krathong float with its candle, used as the app mark. */
export function KrathongIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 12.5c0 3.6 3.8 6 8.5 6s8.5-2.4 8.5-6" />
      <path d="M3.5 12.5h17" />
      <path d="M12 12.4V8.4" />
      <path d="M12 7.8c-.9.7-1.4 1.5-1.4 2.3a1.4 1.4 0 0 0 2.8 0c0-.8-.5-1.6-1.4-2.3Z" />
    </Icon>
  )
}

/** Pointing hand, for "drag to look around". */
export function TapIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 11.4V5.6a1.4 1.4 0 0 1 2.8 0v5.8" />
      <path d="M12.3 11.4V5a1.4 1.4 0 0 1 2.8 0v6.4" />
      <path d="M15.1 11.4V7.6a1.4 1.4 0 0 1 2.8 0v6.6c0 3.4-2.6 6.3-6 6.3-2 0-3.4-.8-4.7-2.4l-2.9-3.8a1.5 1.5 0 0 1 2.3-1.9l2.3 2.3" />
    </Icon>
  )
}

/** Two arrows closing in, for "pinch to zoom". */
export function PinchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12h6M14 12h6" />
      <path d="M8 9l3 3-3 3M16 9l-3 3 3 3" />
    </Icon>
  )
}

export function HeartIcon({ filled = false, ...props }: IconProps & { filled?: boolean }) {
  return (
    <Icon fill={filled ? 'currentColor' : 'none'} {...props}>
      <path d="M20.8 6.6a5 5 0 0 0-7.1 0L12 8.3l-1.7-1.7a5 5 0 1 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1Z" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Icon>
  )
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Icon>
  )
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </Icon>
  )
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Icon>
  )
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.6 6.3A8.8 8.8 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-2.5 3.2M6.4 7.9A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1 0 1.9-.2 2.7-.5" />
      <path d="M10.2 10.3a2.8 2.8 0 0 0 3.6 3.7" />
      <path d="M4 4l16 16" />
    </Icon>
  )
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2l1.1-2h6.4l1.1 2h1.2A2.5 2.5 0 0 1 19 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 16.5Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </Icon>
  )
}

export function ImageIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 5" />
    </Icon>
  )
}

export function FlipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9h13a4 4 0 0 1 0 8H9" />
      <path d="M7 6L4 9l3 3M17 18l3-3-3-3" />
    </Icon>
  )
}

export function ResetIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 0 0 6 5.3M4 15a8 8 0 0 0 14 3.7" />
    </Icon>
  )
}

export function SparkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5v3M12 17.5v3M4.9 7.8l2.6 1.5M16.5 14.7l2.6 1.5M4.9 16.2l2.6-1.5M16.5 9.3l2.6-1.5" />
      <circle cx="12" cy="12" r="2.6" />
    </Icon>
  )
}

export function UploadIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </Icon>
  )
}