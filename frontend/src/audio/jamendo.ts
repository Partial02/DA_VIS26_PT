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

class JamendoPlayer {
  private audio: HTMLAudioElement | null = null
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

  private element() {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'none'
    audio.addEventListener('playing', () => this.set({ playing: true, loading: false, message: '재생 중 · CC 라이선스' }))
    audio.addEventListener('pause', () => { if (!audio.ended && audio.getAttribute('src')) this.set({ playing: false, message: '일시정지' }) })
    audio.addEventListener('ended', () => this.set({ playing: false, message: '재생 완료' }))
    audio.addEventListener('error', () => {
      if (!audio.getAttribute('src') || !this.state.trackId) return // Cleared by stop(); not a failure.
      if (!this.triedDirect && this.state.clientId) {
        // The API's address failed: retry once with the TRACK_ID storage address.
        this.triedDirect = true
        audio.src = directSource(this.state.trackId, this.state.clientId)
        audio.play().catch(() => {})
        return
      }
      this.clear()
      this.set({ playing: false, loading: false, message: '오디오 재생 실패 · Jamendo 연결이나 client_id를 확인하세요' })
    })
    this.audio = audio
    return audio
  }

  private clear() {
    const audio = this.audio
    if (!audio) return
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }

  async play(track: { id: string; title: string; artist: string }) {
    const request = ++this.request // A later click wins.
    this.clear()
    this.set({ trackId: track.id, title: track.title, artist: track.artist, playing: false, loading: true, license: '', message: 'Jamendo에서 불러오는 중…' })
    const { clientId } = this.state
    if (!clientId) { this.set({ loading: false, message: 'client_id가 필요합니다 · 오른쪽 아래 API 키' }); return }
    const source = await resolveSource(track.id, clientId)
    if (request !== this.request) return
    this.triedDirect = source.direct
    const audio = this.element()
    audio.src = source.src
    this.set({ license: source.license })
    try { await audio.play() } catch {
      if (request === this.request && audio.getAttribute('src')) this.set({ loading: false, playing: false, message: '재생하려면 ▶ 버튼을 누르세요' })
    }
  }

  toggle() {
    const audio = this.audio
    if (!audio?.getAttribute('src')) return
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
