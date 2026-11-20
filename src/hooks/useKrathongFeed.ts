import { useCallback, useEffect, useState } from 'react'

import type { KrathongRow } from '../types/db'
import { fetchKrathongs, fetchMyVotes } from '../lib/api'
import { getVoterFingerprint } from '../lib/fingerprint'
import { supabase } from '../lib/supabase'

export type FeedStatus = 'loading' | 'ready' | 'error'

export interface KrathongFeed {
  krathongs: KrathongRow[]
  /** Ids this browser already voted for. */
  votedIds: Set<string>
  status: FeedStatus
  error: string | null
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
  const [isLive, setIsLive] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus('loading')
      setError(null)
      try {
        const [rows, mine] = await Promise.all([
          fetchKrathongs(),
          fetchMyVotes(getVoterFingerprint()),
        ])
        if (cancelled) return
        setKrathongs(rows)
        setVotedIds(new Set(mine))
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

  return {
    krathongs,
    votedIds,
    status,
    error,
    isLive,
    applyVoteCount,
    markVoted,
    upsertKrathong,
    removeKrathong,
    reload,
  }
}
