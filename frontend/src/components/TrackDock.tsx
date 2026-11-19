import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { CSSProperties } from 'react'
import { jamendoPlayer, jamendoTrackUrl } from '../audio/jamendo'
import { formatDuration, scoredPlaylist } from '../domain/catalog'
import { useExperience } from '../state/ExperienceContext'
import { useReducedMotion } from '../state/useReducedMotion'
import { Icon } from './Icon'
import styles from './Interface.module.css'

const BAR_COUNT = 40

/** Bars driven frame by frame by the playing song's spectrum; they rest flat when nothing plays. */
export function SignalBars({ color }: { color?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const bars = [...(root.current?.children ?? [])] as HTMLElement[]
    const levels = new Float32Array(BAR_COUNT), shown = new Float32Array(BAR_COUNT)
    let frame = 0
    const tick = () => {
      const live = jamendoPlayer.levels(levels)
      for (let i = 0; i < BAR_COUNT; i++) {
        const target = live ? .06 + levels[i] * .94 : .06
        // Fast attack, slower release, like a VU meter.
        shown[i] += (target - shown[i]) * (target > shown[i] ? .6 : .18)
        bars[i].style.transform = `scaleY(${shown[i].toFixed(3)})`
      }
      frame = requestAnimationFrame(tick)
    }
    if (!reduced) frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced])
  return <div ref={root} className={styles.signalBars} aria-hidden="true" style={color ? { '--genre-color': color } as CSSProperties : undefined}>
    {Array.from({ length: BAR_COUNT }, (_, i) => <i key={i} />)}
  </div>
}

function JamendoPlayerBar() {
  const player = useSyncExternalStore(jamendoPlayer.subscribe, jamendoPlayer.getSnapshot)
  const [editingKey, setEditingKey] = useState(false)
  const [key, setKey] = useState(player.clientId)
  // Leaving the subgenre unmounts the dock; stop the song with it.
  useEffect(() => () => jamendoPlayer.stop(), [])
  return <div className={styles.player}>
    <div className={styles.playerRow}>
      <button className={styles.playButton} onClick={() => jamendoPlayer.toggle()} disabled={!player.trackId || player.loading}
        aria-label={player.playing ? '일시정지' : '재생'}><Icon name={player.playing ? 'pause' : 'play'} size={16} /></button>
      <div className={styles.playerText} aria-live="polite">
        <strong>{player.trackId ? `${player.title} — ${player.artist}` : '선택된 곡이 없습니다'}</strong>
        <span>{player.message}</span>
      </div>
      <a className={styles.playerLink} href={player.trackId ? jamendoTrackUrl(player.trackId) : 'https://www.jamendo.com'} target="_blank" rel="noopener noreferrer"
        aria-label="Jamendo에서 열기 (새 창)" title="Jamendo에서 열기"><Icon name="external" size={15} /></a>
      <button className={styles.playerLink} aria-expanded={editingKey} aria-controls="jamendoKey" aria-label="Jamendo API 키 설정" title="API 키"
        onClick={() => { setKey(player.clientId); setEditingKey(!editingKey) }}><Icon name="key" size={15} /></button>
    </div>
    {editingKey && <form id="jamendoKey" className={styles.keyForm} onSubmit={event => { event.preventDefault(); jamendoPlayer.setClientId(key); setEditingKey(false) }}>
      <label>Jamendo client_id<input value={key} onChange={event => setKey(event.target.value)} autoComplete="off" spellCheck={false} placeholder="예: f564a7a8" /></label>
      <button className="outlinedButton" type="submit">저장</button>
    </form>}
    <p className={styles.playerNote}>곡 정보는 MTG-Jamendo 데이터셋 기반이며, 음원은 Jamendo의 CC 라이선스 트랙입니다{player.license && <> · <a href={player.license} target="_blank" rel="noopener noreferrer">라이선스</a></>}.</p>
  </div>
}

export function TrackDock() {
  const { catalog, state, dispatch } = useExperience()
  const subgenreId = state.view.level === 'system' ? state.view.subgenreId : null
  // Songs ordered by the picked categories' score (match · typicality · length), artists spread out.
  const scored = useMemo(() => subgenreId ? scoredPlaylist(catalog, subgenreId, state.selection) : [], [catalog, subgenreId, state.selection])
  const current = scored.find(item => item.track.id === state.selectedTrackId)?.track
  const color = subgenreId ? catalog.genreById.get(catalog.subgenreById.get(subgenreId)!.genreId)!.color : undefined
  if (!scored.length) return null
  return <aside className={styles.trackDock} aria-label="현재 영역의 플레이리스트" style={{ '--genre-color': color } as CSSProperties}>
    <div className={styles.panelHeading}><span>플레이리스트 · {scored.length.toLocaleString()}곡</span><span>{state.selection.length ? '고른 범주에 어울리는 순' : '대표성·길이 순'}</span></div>
      <div className={styles.trackList}>{scored.map(({ track, score }, index) => <button key={track.id}
        className={`${styles.trackCard} ${current?.id === track.id ? styles.activeTrack : ''}`}
        aria-pressed={current?.id === track.id} onClick={() => { dispatch({ type: 'selectTrack', id: track.id }); void jamendoPlayer.play(track) }}>
        <span className={styles.trackIndex}>{String(index + 1).padStart(2, '0')}</span>
        <span className={styles.trackText}><strong>{track.title}</strong><span>{track.artist}</span></span>
        <span className={styles.duration}>{formatDuration(track.duration)}</span>
        <span className={styles.trackScore} aria-label={`점수 ${Math.round(score * 100)}`}><i style={{ width: `${Math.round(score * 100)}%` }} /></span>
      </button>)}</div>
      <SignalBars color={color} />
      <JamendoPlayerBar />
  </aside>
}
