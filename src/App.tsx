import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Scene } from './scene/Scene'
import { useKrathongFeed } from './hooks/useKrathongFeed'
import { useReducedEffects } from './hooks/useReducedEffects'
import { ApiError, createKrathong, uploadPhoto, voteKrathong } from './lib/api'
import { getVoterFingerprint } from './lib/fingerprint'
import { isSupabaseConfigured } from './lib/supabase'
import { TopBar } from './ui/TopBar'
import { KrathongList } from './ui/KrathongList'
import { KrathongDetail } from './ui/KrathongDetail'
import { CreateKrathongDialog } from './ui/CreateKrathongDialog'
import type { CreateKrathongValues } from './ui/CreateKrathongDialog'
import { SceneHints } from './ui/SceneHints'
import { ToastStack } from './ui/ToastStack'
import type { Toast, ToastTone } from './types/ui'

function App() {
  const feed = useKrathongFeed()
  const [reducedEffects, setReducedEffects] = useReducedEffects()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)

  // Camera framing: the scene publishes a reset function and reports whether
  // the view has drifted away from the home framing.
  const cameraResetRef = useRef<(() => void) | null>(null)
  const [cameraMoved, setCameraMoved] = useState(false)

  const handleCameraResetReady = useCallback((reset: () => void) => {
    cameraResetRef.current = reset
  }, [])

  const handleCameraMoved = useCallback((moved: boolean) => {
    setCameraMoved(moved)
  }, [])

  const handleResetCamera = useCallback(() => {
    cameraResetRef.current?.()
  }, [])

  const pushToast = useCallback((message: string, tone: ToastTone = 'info') => {
    toastIdRef.current += 1
    const id = toastIdRef.current
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const totalVotes = useMemo(
    () => feed.krathongs.reduce((sum, item) => sum + item.vote_count, 0),
    [feed.krathongs],
  )

  const selectedKrathong = useMemo(
    () => feed.krathongs.find((item) => item.id === selectedId) ?? null,
    [feed.krathongs, selectedId],
  )

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id || null)
    if (id) setListOpen(false)
  }, [])


  const handleVote = useCallback(
    async (id: string) => {
      if (votingId) return
      if (feed.votedIds.has(id)) {
        pushToast('คุณได้โหวตกระทงนี้ไปแล้ว', 'info')
        return
      }

      setVotingId(id)
      try {
        const result = await voteKrathong(id, getVoterFingerprint())
        feed.applyVoteCount(id, result.vote_count)
        feed.markVoted(id)
        pushToast(
          result.already_voted
            ? 'คุณได้โหวตกระทงนี้ไปแล้ว'
            : 'โหวตเรียบร้อย ขอให้คำอธิษฐานของคุณสัมฤทธิ์',
          result.already_voted ? 'info' : 'success',
        )
      } catch (cause) {
        const message =
          cause instanceof ApiError ? cause.message : 'โหวตไม่สำเร็จ กรุณาลองอีกครั้ง'
        pushToast(message, 'error')
      } finally {
        setVotingId(null)
      }
    },
    [feed, pushToast, votingId],
  )

  const handleCreate = useCallback(
    async (values: CreateKrathongValues) => {
      setSubmitting(true)
      try {
        let photoUrl: string | null = null
        if (values.photo) {
          photoUrl = await uploadPhoto(values.photo)
        }

        const created = await createKrathong({
          ownerName: values.ownerName,
          wishText: values.wishText,
          styleId: values.styleId,
          colorHex: values.colorHex,
          photoUrl,
        })

        feed.upsertKrathong(created)
        setCreateOpen(false)
        setSelectedId(created.id)
        pushToast('ส่งกระทงลงแม่น้ำเรียบร้อยแล้ว', 'success')
      } catch (cause) {
        const message =
          cause instanceof ApiError ? cause.message : 'ส่งกระทงไม่สำเร็จ กรุณาลองอีกครั้ง'
        pushToast(message, 'error')
      } finally {
        setSubmitting(false)
      }
    },
    [feed, pushToast],
  )

  // Escape closes the detail card.
  useEffect(() => {
    if (!selectedId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedId])

  if (!isSupabaseConfigured) {
    return (
      <main className="grid min-h-svh place-items-center bg-slate-950 p-6 text-center">
        <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-3 text-4xl">🪔</div>
          <h1 className="text-xl font-semibold text-white">ยังไม่ได้เชื่อมต่อฐานข้อมูล</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            คัดลอกไฟล์ <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.example</code>{' '}
            ไปเป็น <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">.env.local</code>{' '}
            แล้วกรอก <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_SUPABASE_URL</code>{' '}
            และ <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">VITE_SUPABASE_ANON_KEY</code>{' '}
            จากนั้นรีสตาร์ทเซิร์ฟเวอร์
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative h-svh w-full overflow-hidden bg-slate-950">
      {/* 3D river */}
      <div className="absolute inset-0">
        <Scene
          krathongs={feed.krathongs}
          selectedId={selectedId}
          reducedEffects={reducedEffects}
          onSelect={handleSelect}
          onCameraMoved={handleCameraMoved}
          onCameraResetReady={handleCameraResetReady}
        />
      </div>

      <SceneHints canReset={cameraMoved} onResetCamera={handleResetCamera} />

      <TopBar
        total={feed.krathongs.length}
        totalVotes={totalVotes}
        myVotes={feed.votedIds.size}
        isLive={feed.isLive}
        reducedEffects={reducedEffects}
        onToggleEffects={() => setReducedEffects(!reducedEffects)}
        onOpenCreate={() => setCreateOpen(true)}
        onToggleList={() => setListOpen((open) => !open)}
        listOpen={listOpen}
      />

      <KrathongList
        krathongs={feed.krathongs}
        votedIds={feed.votedIds}
        selectedId={selectedId}
        onSelect={handleSelect}
        onVote={handleVote}
        votingId={votingId}
        open={listOpen}
        onClose={() => setListOpen(false)}
      />

      <KrathongDetail
        krathong={selectedKrathong}
        voted={selectedId ? feed.votedIds.has(selectedId) : false}
        voting={votingId === selectedId}
        onVote={handleVote}
        onClose={() => setSelectedId(null)}
      />

      <CreateKrathongDialog
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        submitting={submitting}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Feed status */}
      {feed.status === 'loading' && (
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center lg:bottom-6">
          <div className="rounded-full border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-slate-300 backdrop-blur">
            กำลังโหลดกระทงจากแม่น้ำ…
          </div>
        </div>
      )}

      {feed.status === 'error' && feed.error && (
        <div className="absolute inset-x-0 bottom-4 z-20 flex justify-center px-4 lg:bottom-6">
          <div className="flex max-w-md items-center gap-3 rounded-2xl border border-rose-400/40 bg-rose-950/70 px-4 py-3 text-sm text-rose-100 backdrop-blur">
            <span className="flex-1">{feed.error}</span>
            <button
              type="button"
              onClick={feed.reload}
              className="rounded-lg border border-rose-300/40 px-3 py-1.5 text-xs font-semibold transition hover:bg-rose-400/20"
            >
              ลองใหม่
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App

