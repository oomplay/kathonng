/**
 * Anonymous voter identity.
 *
 * The backend only requires an opaque string of 8–128 characters that is
 * unique per browser, so a UUID kept in localStorage is enough to enforce the
 * one-vote-per-voter rule without asking anyone to sign in.
 */

const STORAGE_KEY = 'kathonng.voter-fingerprint'

let cached: string | null = null

function createFingerprint(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback for browsers without randomUUID; still comfortably in range.
  return `v-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/** Returns this browser's stable voter id, creating it on first use. */
export function getVoterFingerprint(): string {
  if (cached) return cached

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored && stored.length >= 8 && stored.length <= 128) {
      cached = stored
      return stored
    }
  } catch {
    // Private mode / blocked storage: fall through to an in-memory id.
  }

  const fingerprint = createFingerprint()
  try {
    window.localStorage.setItem(STORAGE_KEY, fingerprint)
  } catch {
    // Ignore write failures — the id still works for this session.
  }
  cached = fingerprint
  return fingerprint
}
