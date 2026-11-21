import { useCallback, useEffect, useState } from 'react'

import type { KrathongRow } from '../types/db'
import { ApiError, fetchKrathongs, fetchMyVotes } from '../lib/api'
import { getVoterFingerprint } from '../lib/fingerprint'
import { supabase } from '../lib/supabase'

export type FeedStatus = 'loading' | 'ready' | 'error'

export interface KrathongFeed {
  krathongs: KrathongRow[]
  /** Ids this browser already voted for. */
  votedIds: Set<string>
  status: FeedStatus
  /** Error of the main feed load; the scene stays empty while this is set. */
  error: string | null
  /** Error of the supplementary vote history; the scene still works. */
  voteError: string | null
  /** True once the Realtime channel is subscribed. */
  isLive: boolean
  /** Replaces the tally of one krathong after a successful vote. */
  applyVoteCount: (krathongId: string, voteCount: number) => void
  /** Marks a krathong as already voted by this browser. */
  markVoted: (krathongId: string) => void
  /** Adds or removes a krathong from the local list (Realtime / optimistic). */
  upsertKrathong: (krathong: KrathongRow) => void
  removeKrathong: (krathongId: string) => void
  reload: () => void
  /** Retries only the vote history, leaving a working feed untouched. */
  retryVotes: () => void
}

/** How many times a retryable failure is repeated before giving up. */
const MAX_RETRIES = 2

/** Base backoff between retries in milliseconds; it doubles per attempt. */
const RETRY_BASE_DELAY_MS = 600

/** True when the failure is worth another attempt. */
function isRetryable(cause: unknown): boolean {
  return cause instanceof ApiError && cause.retryable
}

/** Waits for the given delay, used as backoff between retries. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

/**
 * Runs an operation and repeats it while the failure looks temporary.
 *
 * Only transient failures (timeouts, dropped connections) are repeated;
 * a rejected permission or a missing row fails immediately.
 */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  let attempt = 0

  for (;;) {
    try {
      return await operation()
    } catch (cause) {
      if (!isRetryable(cause) || attempt >= MAX_RETRIES) throw cause
      attempt += 1
      await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1))
    }
  }
}

/**
 * Loads the krathong feed and keeps it in sync with Realtime.
 *
 * Realtime publishes full row payloads for `krathongs` because the table uses
 * `REPLICA IDENTITY FULL`, so vote tally updates arrive without a refetch.
 */
export function useKrathongFeed(): KrathongFeed {
  const [krathongs, setKrathongs] = useState<KrathongRow[]>([])
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<FeedStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [voteReloadToken, setVoteReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError(null)
      try {
        // The river is the primary content, so publish it as soon as it is
        // available. Vote history is supplementary and must never keep the
        // whole scene empty while its RPC is slow or temporarily unavailable.
        const rows = await withRetry(fetchKrathongs)
        if (cancelled) return
        setKrathongs(rows)
        setStatus('ready')
      } catch (cause) {
        if (cancelled) return
        setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ')
        setStatus('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // Vote history is loaded separately so a slow or failing RPC never blocks
  // the scene, and so it can be retried without reloading the whole feed.
  useEffect(() => {
    let cancelled = false

    async function loadVotes() {
      setVoteError(null)
      try {
        const mine = await withRetry(() => fetchMyVotes(getVoterFingerprint()))
        if (cancelled) return
        setVotedIds(new Set(mine))
      } catch (cause) {
        if (cancelled) return
        setVoteError(
          cause instanceof Error
            ? `โหลดประวัติการโหวตไม่สำเร็จ: ${cause.message}`
            : 'โหลดประวัติการโหวตไม่สำเร็จ',
        )
      }
    }

    void loadVotes()
    return () => {
      cancelled = true
    }
  }, [voteReloadToken])

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    const channel = client
      .channel('krathongs-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'krathongs' },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<KrathongRow> | undefined
            if (oldRow?.id) {
              setKrathongs((current) => current.filter((item) => item.id !== oldRow.id))
            }
            return
          }

          const next = payload.new as KrathongRow | undefined
          if (!next?.id) return

          setKrathongs((current) => {
            const index = current.findIndex((item) => item.id === next.id)
            if (index === -1) return [next, ...current]
            const updated = [...current]
            updated[index] = { ...updated[index], ...next }
            return updated
          })
        },
      )
      .subscribe((state) => {
        setIsLive(state === 'SUBSCRIBED')
      })

    return () => {
      void client.removeChannel(channel)
    }
  }, [])

  const applyVoteCount = useCallback((krathongId: string, voteCount: number) => {
    setKrathongs((current) =>
      current.map((item) => (item.id === krathongId ? { ...item, vote_count: voteCount } : item)),
    )
  }, [])

  const markVoted = useCallback((krathongId: string) => {
    setVotedIds((current) => {
      if (current.has(krathongId)) return current
      const next = new Set(current)
      next.add(krathongId)
      return next
    })
  }, [])

  const upsertKrathong = useCallback((krathong: KrathongRow) => {
    setKrathongs((current) => {
      const index = current.findIndex((item) => item.id === krathong.id)
      if (index === -1) return [krathong, ...current]
      const updated = [...current]
      updated[index] = { ...updated[index], ...krathong }
      return updated
    })
  }, [])

  const removeKrathong = useCallback((krathongId: string) => {
    setKrathongs((current) => current.filter((item) => item.id !== krathongId))
  }, [])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  const retryVotes = useCallback(() => setVoteReloadToken((token) => token + 1), [])

  return {
    krathongs,
    votedIds,
    status,
    error,
    voteError,
    isLive,
    applyVoteCount,
    markVoted,
    upsertKrathong,
    removeKrathong,
    reload,
    retryVotes,
  }
}
