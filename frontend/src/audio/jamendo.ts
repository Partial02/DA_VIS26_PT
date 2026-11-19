// Jamendo playback ported from Genre Atlas v4. Songs are CC-licensed Jamendo tracks
// addressed by the MTG-Jamendo TRACK_ID; the CSV's relative MP3 path is not used.

export interface JamendoState {
  trackId: string | null
  title: string
  artist: string
  playing: boolean
  loading: boolean
  message: string
  clientId: string
  license: string
}

const STORAGE_KEY = 'jamendo_client_id'
/** Public client_id shipped with Genre Atlas v4; a personal one can replace it. */
export const DEFAULT_CLIENT_ID = 'f564a7a8'
const TIMEOUT_MS = 12000

export function jamendoTrackUrl(trackId: string) {
  return `https://www.jamendo.com/track/${Number(trackId)}`
}

/** Storage URL built from TRACK_ID, used when the API does not return the song. */
export function directSource(trackId: string, clientId: string) {
  return `https://prod-1.storage.jamendo.com/?trackid=${trackId.replace(/\D/g, '').replace(/^0+(?=\d)/, '')}&format=mp32&from=app-${encodeURIComponent(clientId)}`
}

function readClientId() {
  try { return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_CLIENT_ID } catch { return DEFAULT_CLIENT_ID }
}

interface JamendoResponse {
  headers?: { status?: string; error_message?: string }
  results?: { audio?: string; license_ccurl?: string }[]
}

function jsonp(url: string): Promise<JamendoResponse> {
  return new Promise((resolve, reject) => {
    const name = `jamcb_${Math.random().toString(36).slice(2, 10)}`
    const script = document.createElement('script')
    const callbacks = window as unknown as Record<string, unknown>
    const done = () => { clearTimeout(timer); delete callbacks[name]; script.remove() }
    const timer = setTimeout(() => { done(); reject(new Error('응답 없음 (12초)')) }, TIMEOUT_MS)
    callbacks[name] = (data: JamendoResponse) => { done(); resolve(data) }
    script.onerror = () => { done(); reject(new Error('스크립트 로드 실패')) }
    script.src = `${url}&callback=${name}`
    document.head.appendChild(script)
  })
}

async function resolveSource(trackId: string, clientId: string): Promise<{ src: string; license: string; direct: boolean }> {
  const direct = { src: directSource(trackId, clientId), license: '', direct: true }
  try {
    const data = await jsonp(`https://api.jamendo.com/v3.0/tracks/?client_id=${encodeURIComponent(clientId)}&id=${Number(trackId)}&format=json&audioformat=mp32`)
    if (data.headers?.status && data.headers.status !== 'success') return direct
    const track = data.results?.[0]
    if (!track?.audio) return direct
    return { src: track.audio, license: track.license_ccurl ?? '', direct: false }
  } catch { return direct }
}

type Listener = () => void

/**
 * Live levels of the playing song. Jamendo's storage answers CORS, so the element
 * loads with crossOrigin="anonymous" and feeds an AnalyserNode. A source without
 * CORS falls back to a plain element (still audible) and reports no levels.
 */
class LiveMeter {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private bins: Uint8Array<ArrayBuffer> | null = null
  private wave: Uint8Array<ArrayBuffer> | null = null

  attach(audio: HTMLAudioElement) {
    if (this.context) return
    try {
      const context = new AudioContext()
      const analyser = context.createAnalyser()
      analyser.fftSize = 2048
      analyser.smoothingTimeConstant = .72
      context.createMediaElementSource(audio).connect(analyser)
      analyser.connect(context.destination)
      this.context = context
      this.analyser = analyser
      this.bins = new Uint8Array(analyser.frequencyBinCount)
      this.wave = new Uint8Array(analyser.fftSize)
    } catch { /* Web Audio unavailable: levels stay empty, playback continues. */ }
  }

  resume() { void this.context?.resume().catch(() => {}) }

  /**
   * Fill `out` with band levels in [0, 1], low to high frequency; false when nothing is
   * measurable. Bands widen quadratically (≈40 Hz … 16 kHz) and never share an FFT bin.
   */
  levels(out: Float32Array): boolean {
    if (!this.analyser || !this.bins || this.context?.state !== 'running') return false
    this.analyser.getByteFrequencyData(this.bins)
    const n = this.bins.length, bands = out.length, top = n * .72
    let any = false, to = 1
    for (let band = 0; band < bands; band++) {
      const from = to
      to = Math.max(from + 1, Math.round(1 + (top - 1) * ((band + 1) / bands) ** 2))
      let sum = 0
      for (let i = from; i < to && i < n; i++) sum += this.bins[i]
      // Music loses energy toward the treble; tilt it back up, then a gamma spreads the loud range.
      const mean = sum / (to - from) / 255 * (1 + 1.3 * band / bands)
      out[band] = Math.min(1, Math.max(0, (mean - .2) / .65) ** 1.4)
      if (sum) any = true
    }
    return any
  }

  /** Overall loudness (RMS of the waveform) in [0, 1]. */
  volume(): number {
    if (!this.analyser || !this.wave || this.context?.state !== 'running') return 0
    this.analyser.getByteTimeDomainData(this.wave)
    let sum = 0
    for (const value of this.wave) { const x = (value - 128) / 128; sum += x * x }
    return Math.min(1, Math.sqrt(sum / this.wave.length) * 3)
  }
}

class JamendoPlayer {
  private audio: HTMLAudioElement | null = null
  /** Used only when a source refuses CORS; it is never routed through Web Audio. */
  private plain: HTMLAudioElement | null = null
  private meter = new LiveMeter()
  private usingPlain = false
  private listeners = new Set<Listener>()
  private request = 0
  private triedDirect = false
  private state: JamendoState = { trackId: null, title: '', artist: '', playing: false, loading: false, message: '곡을 고르면 Jamendo에서 재생합니다', clientId: readClientId(), license: '' }

  subscribe = (listener: Listener) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.state

  private set(patch: Partial<JamendoState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach(listener => listener())
  }

  /** Live band levels of the playing song; false when no real signal is available. */
  levels = (out: Float32Array) => !this.usingPlain && this.state.playing && this.meter.levels(out)
  /** Live loudness of the playing song in [0, 1]. */
  volume = () => !this.usingPlain && this.state.playing ? this.meter.volume() : 0

  private listen(audio: HTMLAudioElement, onError: () => void) {
    audio.preload = 'none'
    audio.addEventListener('playing', () => this.set({ playing: true, loading: false, message: '재생 중 · CC 라이선스' }))
    audio.addEventListener('pause', () => { if (!audio.ended && audio.getAttribute('src')) this.set({ playing: false, message: '일시정지' }) })
    audio.addEventListener('ended', () => this.set({ playing: false, message: '재생 완료' }))
    audio.addEventListener('error', () => { if (audio.getAttribute('src') && this.state.trackId) onError() })
  }

  private element() {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    this.listen(audio, () => {
      const { trackId, clientId } = this.state
      if (!trackId) return
      if (!this.triedDirect && clientId) {
        // The API's address failed: retry once with the TRACK_ID storage address.
        this.triedDirect = true
        audio.src = directSource(trackId, clientId)
        audio.play().catch(() => {})
        return
      }
      // Possibly a CORS refusal: play the storage address on a plain element instead.
      this.clear()
      this.usingPlain = true
      const plain = this.plainElement()
      plain.src = directSource(trackId, clientId)
      plain.play().catch(() => {})
    })
    this.meter.attach(audio)
    this.audio = audio
    return audio
  }

  private plainElement() {
    if (this.plain) return this.plain
    const plain = new Audio()
    this.listen(plain, () => {
      this.clear()
      this.set({ playing: false, loading: false, message: '오디오 재생 실패 · Jamendo 연결이나 client_id를 확인하세요' })
    })
    this.plain = plain
    return plain
  }

  private clear() {
    for (const audio of [this.audio, this.plain]) {
      if (!audio) continue
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
  }

  private active() { return this.usingPlain ? this.plain : this.audio }

  async play(track: { id: string; title: string; artist: string }) {
    const request = ++this.request // A later click wins.
    this.clear()
    this.set({ trackId: track.id, title: track.title, artist: track.artist, playing: false, loading: true, license: '', message: 'Jamendo에서 불러오는 중…' })
    const { clientId } = this.state
    if (!clientId) { this.set({ loading: false, message: 'client_id가 필요합니다 · 오른쪽 아래 API 키' }); return }
    const source = await resolveSource(track.id, clientId)
    if (request !== this.request) return
    this.triedDirect = source.direct
    this.usingPlain = false
    const audio = this.element()
    this.meter.resume()
    audio.src = source.src
    this.set({ license: source.license })
    try { await audio.play() } catch {
      if (request === this.request && audio.getAttribute('src')) this.set({ loading: false, playing: false, message: '재생하려면 ▶ 버튼을 누르세요' })
    }
  }

  toggle() {
    const audio = this.active()
    if (!audio?.getAttribute('src')) return
    this.meter.resume()
    if (audio.paused) void audio.play().catch(() => this.set({ message: '재생하지 못했습니다' }))
    else audio.pause()
  }

  stop() {
    this.request++
    this.clear()
    this.set({ trackId: null, title: '', artist: '', playing: false, loading: false, license: '', message: '곡을 고르면 Jamendo에서 재생합니다' })
  }

  setClientId(value: string) {
    const clientId = value.trim()
    try { localStorage.setItem(STORAGE_KEY, clientId) } catch { /* Storage may be unavailable. */ }
    this.set({ clientId, message: clientId ? 'client_id 저장됨 · 곡을 고르세요' : 'client_id가 없으면 재생할 수 없습니다' })
  }
}

export const jamendoPlayer = new JamendoPlayer()
