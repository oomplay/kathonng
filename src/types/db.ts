/**
 * Trimmed database contract for the `public` schema.
 *
 * Only the columns the app actually reads are declared here; the Supabase
 * client is intentionally typed loosely and every result is cast at the API
 * boundary (see `src/lib/api.ts`).
 */

export type StyleId = 'classic' | 'lotus' | 'golden' | 'neon'

export interface KrathongRow {
  id: string
  owner_name: string
  wish_text: string
  style_id: StyleId
  color_hex: string
  photo_url: string | null
  vote_count: number
  created_at: string
}

export interface VoteLogRow {
  id: string
  krathong_id: string
  voter_fingerprint: string
  created_at: string
}

/** Return shape of `increment_vote(target_krathong_id uuid, voter_id text)`. */
export interface IncrementVoteResult {
  vote_count: number
  already_voted: boolean
}
