import { useEffect, useState } from 'react'

/**
 * Tracks the user's reduced-motion preference and lets the UI override it.
 *
 * The override wins over the OS setting so the "ลดเอฟเฟกต์" switch in the
 * top bar is always authoritative.
 */
export function useReducedEffects(): [boolean, (value: boolean) => void] {
  const [systemPrefersReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [override, setOverride] = useState<boolean | null>(null)

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = (event: MediaQueryListEvent) => setOverride(event.matches ? true : null)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return [override ?? systemPrefersReduced, setOverride]
}
