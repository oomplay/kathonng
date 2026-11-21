import type { IncrementVoteResult, KrathongRow } from '../types/db'
import { supabase } from './supabase'

/** Error raised for every failed network / database interaction. */
export class ApiError extends Error {
  readonly code?: string
  /** True when the failure looks temporary and the request is worth repeating. */
  readonly retryable: boolean

  constructor(message: string, code?: string, retryable = false) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.retryable = retryable
  }
}

/** How long a single request may take before it is aborted. */
export const REQUEST_TIMEOUT_MS = 10_000

/** Message shown when a request was aborted because it ran out of time. */
export const TIMEOUT_MESSAGE = 'การเชื่อมต่อฐานข้อมูลใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง'

const KRATHONG_COLUMNS =
  'id, owner_name, wish_text, style_id, color_hex, photo_url, vote_count, created_at'

/** Minimal shape of a PostgREST response used by this module. */
interface PostgrestResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

/**
 * True when a PostgREST failure looks temporary.
 *
 * Network hiccups and a cold PostgREST schema cache both clear up on their
 * own, so the feed retries them instead of showing a dead end to the user.
 */
function isTransientFailure(error: { message: string; code?: string }): boolean {
  if (error.code === 'timeout' || error.code === 'PGRST503') return true
  if (error.code) return false
  return /fetch failed|failed to fetch|network|ETIMEDOUT|ECONNRESET|socket/i.test(error.message)
}

/**
 * Runs a PostgREST request under a hard timeout.
 *
 * The request is aborted through PostgREST's `abortSignal()`, so a stalled
 * connection cannot leave the app spinning forever.
 */
async function requestWithTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<PostgrestResult<T>>,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<PostgrestResult<T>> {
  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    const result = await request(controller.signal)
    if (timedOut) {
      return { data: null, error: { message: TIMEOUT_MESSAGE, code: 'timeout' } }
    }
    return result
  } catch (cause) {
    if (timedOut) {
      return { data: null, error: { message: TIMEOUT_MESSAGE, code: 'timeout' } }
    }
    throw cause
  } finally {
    clearTimeout(timer)
  }
}

function requireClient() {
  if (!supabase) {
    throw new ApiError(
      'ยังไม่ได้ตั้งค่า Supabase — กรุณาคัดลอก .env.example เป็น .env.local แล้วกรอกค่าให้ครบ',
      'missing_config',
    )
  }
  return supabase
}

/** Maps Postgres error codes onto Thai messages that make sense to a user. */
function describeError(error: { message: string; code?: string }): string {
  if (error.code === 'timeout') {
    return TIMEOUT_MESSAGE
  }
  if (error.code === 'P0002' || error.message.includes('krathong not found')) {
    return 'ไม่พบกระทงนี้แล้ว อาจถูกนำออกจากแม่น้ำ'
  }
  if (error.code === '22023' || error.message.includes('invalid voter id')) {
    return 'ระบบระบุตัวผู้โหวตไม่ถูกต้อง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง'
  }
  if (error.code === '42501' || error.message.includes('row-level security')) {
    return 'ไม่มีสิทธิ์ในการทำรายการนี้'
  }
  if (error.message.includes('violates unique constraint')) {
    return 'คุณได้โหวตกระทงนี้ไปแล้ว'
  }
  return error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'
}

/** Loads every krathong, most-voted first. */
export async function fetchKrathongs(): Promise<KrathongRow[]> {
  const client = requireClient()
  const { data, error } = await requestWithTimeout((signal) =>
    client
      .from('krathongs')
      .select(KRATHONG_COLUMNS)
      .order('vote_count', { ascending: false })
      .order('created_at', { ascending: false })
      .abortSignal(signal),
  )

  if (error) {
    throw new ApiError(describeError(error), error.code, isTransientFailure(error))
  }
  return (data ?? []) as KrathongRow[]
}

/** Returns the ids this browser has already voted for. */
export async function fetchMyVotes(voterId: string): Promise<string[]> {
  const client = requireClient()
  const { data, error } = await requestWithTimeout((signal) =>
    client.rpc('get_my_votes', { voter_id: voterId }).abortSignal(signal),
  )

  if (error) {
    throw new ApiError(describeError(error), error.code, isTransientFailure(error))
  }
  return (data ?? []) as string[]
}

export interface CreateKrathongInput {
  ownerName: string
  wishText: string
  styleId: string
  colorHex: string
  photoUrl?: string | null
}

/** Inserts a new krathong. `vote_count` is left to the column default (0). */
export async function createKrathong(input: CreateKrathongInput): Promise<KrathongRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('krathongs')
    .insert({
      owner_name: input.ownerName,
      wish_text: input.wishText,
      style_id: input.styleId,
      color_hex: input.colorHex,
      photo_url: input.photoUrl ?? null,
    })
    .select(KRATHONG_COLUMNS)
    .single()

  if (error) throw new ApiError(describeError(error), error.code)
  return data as KrathongRow
}

/**
 * Casts a vote through the `increment_vote` RPC, which owns the tally and the
 * one-vote-per-voter uniqueness rule.
 */
export async function voteKrathong(
  krathongId: string,
  voterId: string,
): Promise<IncrementVoteResult> {
  const client = requireClient()
  const { data, error } = await client.rpc('increment_vote', {
    target_krathong_id: krathongId,
    voter_id: voterId,
  })

  if (error) throw new ApiError(describeError(error), error.code)

  const row = Array.isArray(data) ? data[0] : data
  if (!row) throw new ApiError('ไม่สามารถบันทึกการโหวตได้', 'empty_result')
  return row as IncrementVoteResult
}

const PHOTO_BUCKET = 'krathong-photos'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']

/** Uploads a photo to the public bucket and returns its public URL. */
export async function uploadPhoto(file: File): Promise<string> {
  if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
    throw new ApiError('รองรับเฉพาะไฟล์ PNG, JPEG, WEBP และ AVIF', 'invalid_type')
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new ApiError('รูปภาพต้องมีขนาดไม่เกิน 5 MB', 'too_large')
  }

  const client = requireClient()
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
  const path = `${crypto.randomUUID()}.${extension}`

  const { error } = await client.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw new ApiError(describeError(error), error.statusCode)

  const { data } = client.storage.from(PHOTO_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
