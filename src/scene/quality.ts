/**
 * Adaptive rendering quality.
 *
 * The app must look the same on a normal GPU, but software WebGL
 * implementations (SwiftShader, llvmpipe) can be one to two orders of
 * magnitude slower. This module detects those renderers before the first
 * heavy frame and exposes a quality tier the scene can switch to.
 */

/** Rendering tiers, from richest to cheapest. */
export type RenderQuality = 'full' | 'degraded'

/** Substrings that identify a software renderer. */
const SOFTWARE_RENDERER_MARKERS = ['swiftshader', 'llvmpipe', 'software rasterizer', 'softwarerasterizer']

/** True when the unmasked renderer string points at a software rasteriser. */
export function isSoftwareRenderer(renderer: string): boolean {
  const normalized = renderer.toLowerCase()
  return SOFTWARE_RENDERER_MARKERS.some((marker) => normalized.includes(marker))
}

/**
 * Reads the unmasked renderer string from a throwaway WebGL context.
 *
 * Returns `null` when the browser hides the information or no context can be
 * created; callers then keep the full quality tier.
 */
export function detectRendererName(): string | null {
  if (typeof document === 'undefined') return null

  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ??
      (canvas.getContext('webgl') as WebGLRenderingContext | null)
    if (!gl) return null

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    if (!debugInfo) return null

    const name = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    return typeof name === 'string' ? name : null
  } catch {
    return null
  }
}

/**
 * The quality tier requested through the `?quality=` query parameter.
 *
 * Returns `null` when the parameter is absent or invalid, in which case the
 * tier is detected from the renderer.
 */
export function getQualityOverride(): RenderQuality | null {
  if (typeof window === 'undefined') return null
  const requested = new URLSearchParams(window.location.search).get('quality')
  return requested === 'full' || requested === 'degraded' ? requested : null
}

/**
 * Picks the starting quality tier from the renderer.
 *
 * This runs before the scene mounts, so a software renderer never has to
 * draw a single expensive frame. The `?quality=full|degraded` query
 * parameter overrides the detection, which makes both tiers testable.
 */
export function detectInitialQuality(): RenderQuality {
  const override = getQualityOverride()
  if (override) return override

  const renderer = detectRendererName()
  if (!renderer) return 'full'
  return isSoftwareRenderer(renderer) ? 'degraded' : 'full'
}

/**
 * The tier the app starts with.
 *
 * The detection opens a WebGL context, so it is done once per page load and
 * then reused by every React render.
 */
let initialQuality: RenderQuality | null = null

/** Returns the starting quality tier, detecting it on first use. */
export function getInitialQuality(): RenderQuality {
  if (initialQuality === null) initialQuality = detectInitialQuality()
  return initialQuality
}

/** Frame rate below which the scene is considered too slow to keep full quality. */
export const LOW_FPS_THRESHOLD = 24

/** How many frames are averaged before the frame rate is judged. */
export const LOW_FPS_SAMPLES = 3

/**
 * Time the watchdog ignores before it starts judging.
 *
 * The first seconds of a scene are slow: shaders are compiled, textures are
 * uploaded and the first geometry is built. Judging those frames would
 * downgrade a perfectly capable GPU, so the warm-up only measures time and
 * discards its samples.
 */
export const LOW_FPS_WARMUP_MS = 2500

/**
 * Number of frames the watchdog ignores while the scene warms up.
 *
 * The time-based warm-up alone is not enough: a handful of very slow frames
 * can consume the whole warm-up window, so the first frames are also counted
 * and skipped explicitly.
 */
export const LOW_FPS_WARMUP_FRAMES = 30

/**
 * How many consecutive slow windows are required before the scene gives up
 * the full quality tier.
 *
 * Several windows have to agree, so a one-off stall (a garbage collection, a
 * background tab, a shader compile) cannot downgrade a healthy GPU.
 */
export const LOW_FPS_CONSECUTIVE_WINDOWS = 4

/**
 * Tracks frame rate over a window of samples.
 *
 * The caller feeds one sample per rendered frame; the tracker reports when the
 * scene has been slow for long enough that dropping to a cheaper tier is
 * worth the visual change.
 */
export class FpsMonitor {
  private samples: number[] = []
  private elapsedMs = 0
  private frames = 0
  private slowWindows = 0
  private readonly threshold: number
  private readonly requiredSamples: number
  private readonly warmupMs: number
  private readonly warmupFrames: number
  private readonly requiredSlowWindows: number

  constructor(
    threshold: number = LOW_FPS_THRESHOLD,
    requiredSamples: number = LOW_FPS_SAMPLES,
    warmupMs: number = LOW_FPS_WARMUP_MS,
    requiredSlowWindows: number = LOW_FPS_CONSECUTIVE_WINDOWS,
    warmupFrames: number = LOW_FPS_WARMUP_FRAMES,
  ) {
    this.threshold = threshold
    this.requiredSamples = requiredSamples
    this.warmupMs = warmupMs
    this.requiredSlowWindows = requiredSlowWindows
    this.warmupFrames = warmupFrames
  }

  /** Adds one frame time in milliseconds and returns true when it is too slow. */
  add(frameTimeMs: number): boolean {
    this.elapsedMs += frameTimeMs
    this.frames += 1

    // Warm-up: measure the time, but throw the samples away.
    if (this.elapsedMs < this.warmupMs || this.frames <= this.warmupFrames) {
      this.samples = []
      return false
    }

    this.samples.push(frameTimeMs)
    if (this.samples.length < this.requiredSamples) return false

    const average = this.samples.reduce((sum, value) => sum + value, 0) / this.samples.length
    this.samples = []

    const fps = average > 0 ? 1000 / average : 0
    if (fps >= this.threshold) {
      // A fast window clears the streak.
      this.slowWindows = 0
      return false
    }

    this.slowWindows += 1
    return this.slowWindows >= this.requiredSlowWindows
  }

  /** Forgets the collected samples, e.g. after the tab was hidden. */
  reset(): void {
    this.samples = []
    this.elapsedMs = 0
    this.frames = 0
    this.slowWindows = 0
  }
}