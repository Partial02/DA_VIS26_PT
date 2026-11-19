// Spectrum → bar heights for the live music bars.
//
// The analyser's byte data clips everything above −30 dB to 255, so a loud master
// (rock, metal, EDM) pinned every bar at the top. This works on float dB instead and
// normalizes against a running peak (automatic gain): the loudest band sits a few dB
// below the top, and only a transient louder than the recent peak reaches it. Quiet
// songs are lifted the same way, down to a floor so silence stays flat.

/** dB span shown between an empty bar and a full one. */
export const RANGE_DB = 48
/** The running peak sits this far below the top of the bar. */
export const HEADROOM_DB = 4.5
/** The running peak never drops below this, so near-silence is not amplified. */
export const PEAK_FLOOR_DB = -72
/** How fast the running peak falls after a loud passage (dB per second). */
export const PEAK_RELEASE_DB = 5
/** Share of the gap the running peak closes per 60 fps frame when the music gets louder. */
export const PEAK_ATTACK = .2
/** Treble compensation in dB per octave above 100 Hz (music falls ~3–4.5 dB/octave). */
export const TILT_DB_PER_OCTAVE = 2.5
/** Contrast curve applied to the normalized level. */
export const GAMMA = 1.5

const SILENT_DB = -160

export interface LevelState { peak: number }

export const createLevelState = (): LevelState => ({ peak: -40 })

/**
 * Fill `out` with bar levels in [0, 1], low to high frequency, from analyser float dB
 * `bins` (bin width `binHz`); `dt` is the time since the last call in seconds. Bands
 * widen quadratically up to 72% of Nyquist and never share an FFT bin; each band is the
 * power mean of its bins. Returns false when the input is silent.
 */
export function bandLevels(bins: Float32Array, binHz: number, out: Float32Array, state: LevelState, dt: number): boolean {
  const n = bins.length, bands = out.length, top = n * .72
  let loudest = -Infinity, sound = false, to = 1
  for (let band = 0; band < bands; band++) {
    const from = to
    to = Math.min(n, Math.max(from + 1, Math.round(1 + (top - 1) * ((band + 1) / bands) ** 2)))
    let power = 0
    for (let i = from; i < to; i++) if (bins[i] > SILENT_DB) power += 10 ** (bins[i] / 10)
    if (!power) { out[band] = -Infinity; continue }
    sound = true
    const center = (from + to) / 2 * binHz
    const db = 10 * Math.log10(power / (to - from)) + TILT_DB_PER_OCTAVE * Math.max(0, Math.log2(center / 100))
    out[band] = db
    if (db > loudest) loudest = db
  }
  if (!sound) { out.fill(0); return false }
  // Rise quickly toward a louder passage, fall slowly after it; frame-rate independent.
  const step = Math.min(dt, .1)
  state.peak = loudest > state.peak
    ? state.peak + (loudest - state.peak) * (1 - (1 - PEAK_ATTACK) ** (step * 60))
    : Math.max(loudest, state.peak - PEAK_RELEASE_DB * step)
  state.peak = Math.max(state.peak, PEAK_FLOOR_DB)
  const floor = state.peak + HEADROOM_DB - RANGE_DB
  for (let band = 0; band < bands; band++) {
    const x = (out[band] - floor) / RANGE_DB
    out[band] = x <= 0 ? 0 : Math.min(1, x) ** GAMMA
  }
  return true
}

/** Soft loudness in [0, 1] from a waveform RMS in [0, 1]; approaches 1 without clipping. */
export const loudness = (rms: number) => 1 - Math.exp(-rms * 3.2)
