import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useKrathongFeed } from './hooks/useKrathongFeed'
import { useReducedEffects } from './hooks/useReducedEffects'
import { getInitialQuality, getQualityOverride, type RenderQuality } from './scene/quality'
import { ApiError, createKrathong, uploadPhoto, voteKrathong } from './lib/api'
import { getVoterFingerprint } from './lib/fingerprint'
import { isSupabaseConfigured } from './lib/supabase'
import { ErrorBoundary } from './components/ErrorBoundary'
import { TopBar } from './ui/TopBar'
import { KrathongList } from './ui/KrathongList'
import { KrathongDetail } from './ui/KrathongDetail'
import type { CreateKrathongValues } from './ui/CreateKrathongDialog'
import { SceneHints } from './ui/SceneHints'
import { DialogLoader, SceneLoader } from './ui/SceneLoader'
import { ToastStack } from './ui/ToastStack'
import type { Toast, ToastTone } from './types/ui'

/**
 * The 3D scene is the heaviest dependency in the app, so it is loaded as a
 * separate chunk after the shell has painted. The HUD stays interactive while
 * the chunk is on the wire.
 */
const Scene = lazy(() =>
  import('./scene/Scene').then((module) => ({ default: module.Scene })),
)

/**
 * The create dialog pulls in the camera capture code, which is only needed
 * once the user actually wants to float a krathong.
 */
const CreateKrathongDialog = lazy(() =>
  import('./ui/CreateKrathongDialog').then((module) => ({
    default: module.CreateKrathongDialog,
  })),
)

/**
 * Shown in place of the 3D canvas when the scene cannot be rendered.
 *
 * The canvas is decorative: the krathong list, voting and the create dialog
 * all live in the DOM above it. Keeping the HUD alive means a broken WebGL
 * context or a missing model degrades the page instead of blanking it.
 */
function SceneUnavailable() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-river-950 px-6 text-center">
      <div className="max-w-sm">
        <div className="mb-3 text-4xl" aria-hidden="true">
          🌙
        </div>
        <h2 className="text-lg font-semibold text-mist-50">ฉาก 3 มิติไม่สามารถแสดงผลได้</h2>
        <p className="mt-2 text-sm leading-relaxed text-mist-300">
          คุณยังเลือกกระทง โหวต และลอยกระทงของคุณได้ตามปกติจากรายการด้านข้าง
        </p>
      </div>
    </div>
  )
}

function App() {
  const feed = useKrathongFeed()
  const [reducedEffects, setReducedEffects] = useReducedEffects()
  // Software renderers start in the cheap tier, before the first heavy frame.
  const [quality, setQuality] = useState<RenderQuality>(() => getInitialQuality())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  // The create dialog chunk is only fetched once the user asks for it, but it
  // stays mounted afterwards so the native dialog can close (and hand focus
  // back) instead of being torn out of the DOM.
  const [createDialogLoaded, setCreateDialogLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastIdRef = useRef(0)
  const detailTriggerRef = useRef<HTMLElement | null>(null)

  // Camera framing: the scene publishes a reset function and reports whether
  // the view has drifted away from the home framing.
  const cameraResetRef = useRef<(() => void) | null>(null)
  const cameraFocusRef = useRef<((id: string) => void) | null>(null)
  const [cameraMoved, setCameraMoved] = useState(false)

  const handleCameraResetReady = useCallback((reset: () => void) => {
    cameraResetRef.current = reset
  }, [])

  const handleCameraFocusReady = useCallback((focus: (id: string) => void) => {
    cameraFocusRef.current = focus
  }, [])

  const handleCameraMoved = useCallback((moved: boolean) => {
    setCameraMoved(moved)
  }, [])

  const handleResetCamera = useCallback(() => {
    cameraResetRef.current?.()
  }, [])

  // A sustained low frame rate means the scene is too heavy for this device,
  // so it drops to the cheaper tier instead of crawling. An explicit
  // `?quality=` request is a deliberate choice, so it is never overridden.
  const qualityLocked = getQualityOverride() !== null
  const handleLowPerformance = useCallback(() => {
    if (qualityLocked) return
    setQuality('degraded')
  }, [qualityLocked])

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
    if (id) {
      detailTriggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null
    }
    setSelectedId(id || null)
    if (id) setListOpen(false)
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedId(null)
    // Return focus to the row or 3D control that opened the detail card.
    // If the trigger disappeared (for example a live feed refresh), fall back
    // to the list toggle so keyboard users are never stranded.
    window.requestAnimationFrame(() => {
      const trigger = detailTriggerRef.current
      if (trigger?.isConnected) {
        trigger.focus()
      } else {
        document.querySelector<HTMLButtonElement>('[aria-label="แสดงรายการกระทง"]')?.focus()
      }
    })
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

  const handleOpenCreate = useCallback(() => {
    setCreateDialogLoaded(true)
    setCreateOpen(true)
  }, [])

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
        // The scene derives world positions from the feed. Wait for the new
        // row to be rendered before asking the rig to fly to it; otherwise the
        // first focus request can arrive before its placement exists.
        window.setTimeout(() => cameraFocusRef.current?.(created.id), 120)
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

  // Escape closes the detail card and returns focus to its trigger.
  useEffect(() => {
    if (!selectedId) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleCloseDetail()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleCloseDetail, selectedId])

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
    <main
      className="relative h-svh w-full overflow-hidden bg-river-950"
      // Exposes the active rendering tier for diagnostics and visual checks.
      data-quality={quality}
    >
      {/* 3D river. The heavy chunk loads after the HUD shell has painted.
          The error boundary keeps a failed canvas (missing WebGL, a broken
          model) from unmounting the HUD above it. */}
      <div className="absolute inset-0">
        <ErrorBoundary fallback={<SceneUnavailable />}>
          <Suspense fallback={<SceneLoader />}>
            <Scene
              krathongs={feed.krathongs}
              selectedId={selectedId}
              reducedEffects={reducedEffects}
              quality={quality}
              onSelect={handleSelect}
              onCameraMoved={handleCameraMoved}
              onCameraResetReady={handleCameraResetReady}
              onCameraFocusReady={handleCameraFocusReady}
              onLowPerformance={handleLowPerformance}
            />
          </Suspense>
        </ErrorBoundary>
      </div>

      <TopBar
        total={feed.krathongs.length}
        totalVotes={totalVotes}
        myVotes={feed.votedIds.size}
        isLive={feed.isLive}
        reducedEffects={reducedEffects}
        onToggleEffects={() => setReducedEffects(!reducedEffects)}
        onOpenCreate={handleOpenCreate}
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
        onClose={handleCloseDetail}
      />

      {createDialogLoaded && (
        <Suspense fallback={<DialogLoader />}>
          <CreateKrathongDialog
            open={createOpen}
            submitting={submitting}
            onClose={() => setCreateOpen(false)}
            onSubmit={handleCreate}
          />
        </Suspense>
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />

      {/* Bottom chrome: hints and feed status share one stack so they never
          overlap each other or the detail card. */}
        {/* On phones and tablets the detail card occupies the bottom of the
            screen. Hiding the camera hints while it is open keeps the two
            pieces of chrome from overlapping; desktop keeps both visible
            because the detail card is docked to the left. */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 p-3 sm:p-5 xl:right-[25rem] ${
            selectedId ? 'hidden lg:flex' : 'flex'
          }`}
        >
        {feed.status === 'loading' && (
          <div className="surface-glass pointer-events-auto rounded-full px-4 py-2 text-sm text-mist-300">
            กำลังโหลดกระทงจากแม่น้ำ…
          </div>
        )}

        {feed.status === 'error' && feed.error && (
          <div className="surface-glass pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-ember-400/40 px-4 py-3 text-sm text-ember-300">
            <span className="flex-1">{feed.error}</span>
            <button
              type="button"
              onClick={feed.reload}
              className="control control-secondary min-h-11 px-3 py-1.5 text-xs"
            >
              ลองใหม่
            </button>
          </div>
        )}

        {feed.voteError && (
          <div className="surface-glass pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl border-candle-400/40 px-4 py-2 text-xs text-candle-200">
            <span className="flex-1">{feed.voteError}</span>
            <button
              type="button"
              onClick={feed.retryVotes}
              className="control control-secondary min-h-11 px-3 py-1 text-xs"
            >
              ลองใหม่
            </button>
          </div>
        )}

        <SceneHints canReset={cameraMoved} onResetCamera={handleResetCamera} />
      </div>
    </main>
  )
}

export default App

